--
-- PostgreSQL database dump
--

\restrict QJ5ouv0d4eRtQhLds4hzTp9AG7hOjIJ6gYvWxNo91KPxaZjluWvyYlwltR9TRH6

-- Dumped from database version 15.14 (Debian 15.14-1.pgdg13+1)
-- Dumped by pg_dump version 15.14 (Debian 15.14-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

DROP DATABASE IF EXISTS birdsphere;
--
-- Name: birdsphere; Type: DATABASE; Schema: -; Owner: birdsphere_user
--

CREATE DATABASE birdsphere WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';


ALTER DATABASE birdsphere OWNER TO birdsphere_user;

\unrestrict QJ5ouv0d4eRtQhLds4hzTp9AG7hOjIJ6gYvWxNo91KPxaZjluWvyYlwltR9TRH6
\connect birdsphere
\restrict QJ5ouv0d4eRtQhLds4hzTp9AG7hOjIJ6gYvWxNo91KPxaZjluWvyYlwltR9TRH6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: test_migration; Type: SCHEMA; Schema: -; Owner: birdsphere_user
--

CREATE SCHEMA test_migration;


ALTER SCHEMA test_migration OWNER TO birdsphere_user;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: extract_hashtags_and_keywords(); Type: FUNCTION; Schema: public; Owner: birdsphere_user
--

CREATE FUNCTION public.extract_hashtags_and_keywords() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Extract hashtags using regex
    NEW.hashtags = ARRAY(
        SELECT DISTINCT lower(substring(match[1] from 2))
        FROM regexp_split_to_table(NEW.content, '\s+') AS word,
             regexp_matches(word, '(#\w+)', 'g') AS match
    );

    -- Extract search keywords (words longer than 2 characters)
    NEW.search_keywords = ARRAY(
        SELECT DISTINCT lower(word)
        FROM regexp_split_to_table(regexp_replace(NEW.content, '[^\w\s]', '', 'g'), '\s+') AS word
        WHERE length(word) > 2
    );

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.extract_hashtags_and_keywords() OWNER TO birdsphere_user;

--
-- Name: update_comment_count(); Type: FUNCTION; Schema: public; Owner: birdsphere_user
--

CREATE FUNCTION public.update_comment_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;

        -- Update reply count for parent comment
        IF NEW.parent_comment_id IS NOT NULL THEN
            UPDATE comments SET reply_count = reply_count + 1 WHERE id = NEW.parent_comment_id;
        END IF;

        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id;

        -- Update reply count for parent comment
        IF OLD.parent_comment_id IS NOT NULL THEN
            UPDATE comments SET reply_count = reply_count - 1 WHERE id = OLD.parent_comment_id;
        END IF;

        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION public.update_comment_count() OWNER TO birdsphere_user;

--
-- Name: update_engagement_score(); Type: FUNCTION; Schema: public; Owner: birdsphere_user
--

CREATE FUNCTION public.update_engagement_score() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    age_hours DECIMAL;
    recency_boost DECIMAL;
BEGIN
    -- Calculate age in hours
    age_hours = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - NEW.created_at)) / 3600;

    -- Calculate recency boost (more recent posts get higher boost)
    recency_boost = GREATEST(1, (48 - age_hours) / 48);

    -- Update engagement score with weighted formula
    NEW.engagement_score = (
        (NEW.reaction_count * 1) +
        (NEW.comment_count * 2) +
        (NEW.share_count * 5) +
        (NEW.view_count * 0.1)
    ) * recency_boost;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_engagement_score() OWNER TO birdsphere_user;

--
-- Name: update_reaction_count(); Type: FUNCTION; Schema: public; Owner: birdsphere_user
--

CREATE FUNCTION public.update_reaction_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.target_type = 'post' THEN
            UPDATE posts SET reaction_count = reaction_count + 1 WHERE id = NEW.target_id;
        ELSIF NEW.target_type = 'comment' THEN
            UPDATE comments SET reaction_count = reaction_count + 1 WHERE id = NEW.target_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.target_type = 'post' THEN
            UPDATE posts SET reaction_count = reaction_count - 1 WHERE id = OLD.target_id;
        ELSIF OLD.target_type = 'comment' THEN
            UPDATE comments SET reaction_count = reaction_count - 1 WHERE id = OLD.target_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION public.update_reaction_count() OWNER TO birdsphere_user;

--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: birdsphere_user
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at() OWNER TO birdsphere_user;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: birdsphere_user
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO birdsphere_user;

--
-- Name: update_user_rating(); Type: FUNCTION; Schema: public; Owner: birdsphere_user
--

CREATE FUNCTION public.update_user_rating() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE users
    SET
        rating = (
            SELECT ROUND(AVG(rating::numeric), 2)
            FROM user_ratings
            WHERE rated_user_id = COALESCE(NEW.rated_user_id, OLD.rated_user_id)
        ),
        rating_count = (
            SELECT COUNT(*)
            FROM user_ratings
            WHERE rated_user_id = COALESCE(NEW.rated_user_id, OLD.rated_user_id)
        )
    WHERE id = COALESCE(NEW.rated_user_id, OLD.rated_user_id);

    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION public.update_user_rating() OWNER TO birdsphere_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: animal_categories; Type: TABLE; Schema: public; Owner: birdsphere_user
--

CREATE TABLE public.animal_categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    parent_id integer,
    level integer DEFAULT 1 NOT NULL,
    icon character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.animal_categories OWNER TO birdsphere_user;

--
-- Name: TABLE animal_categories; Type: COMMENT; Schema: public; Owner: birdsphere_user
--

COMMENT ON TABLE public.animal_categories IS 'Hierarchical animal category structure for user interests';


--
-- Name: animal_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: birdsphere_user
--

CREATE SEQUENCE public.animal_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.animal_categories_id_seq OWNER TO birdsphere_user;

--
-- Name: animal_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: birdsphere_user
--

ALTER SEQUENCE public.animal_categories_id_seq OWNED BY public.animal_categories.id;


--
-- Name: animal_category_hierarchy; Type: VIEW; Schema: public; Owner: birdsphere_user
--

CREATE VIEW public.animal_category_hierarchy AS
 WITH RECURSIVE category_tree AS (
         SELECT animal_categories.id,
            animal_categories.name,
            animal_categories.parent_id,
            animal_categories.level,
            animal_categories.icon,
            (animal_categories.name)::text AS full_path,
            ARRAY[animal_categories.id] AS path_ids
           FROM public.animal_categories
          WHERE (animal_categories.parent_id IS NULL)
        UNION ALL
         SELECT c.id,
            c.name,
            c.parent_id,
            c.level,
            c.icon,
            ((ct.full_path || ' → '::text) || (c.name)::text) AS full_path,
            (ct.path_ids || c.id) AS path_ids
           FROM (public.animal_categories c
             JOIN category_tree ct ON ((c.parent_id = ct.id)))
        )
 SELECT category_tree.id,
    category_tree.name,
    category_tree.parent_id,
    category_tree.level,
    category_tree.icon,
    category_tree.full_path,
    category_tree.path_ids
   FROM category_tree
  ORDER BY category_tree.level, category_tree.full_path;


ALTER TABLE public.animal_category_hierarchy OWNER TO birdsphere_user;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: birdsphere_user
--

CREATE TABLE public.categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    parent_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.categories OWNER TO birdsphere_user;

--
-- Name: comment_edit_history; Type: TABLE; Schema: public; Owner: birdsphere_user
--

CREATE TABLE public.comment_edit_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    comment_id uuid NOT NULL,
    content text NOT NULL,
    edited_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.comment_edit_history OWNER TO birdsphere_user;

--
-- Name: comment_reactions; Type: TABLE; Schema: public; Owner: birdsphere_user
--

CREATE TABLE public.comment_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    comment_id uuid NOT NULL,
    user_id uuid NOT NULL,
    reaction_type character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.comment_reactions OWNER TO birdsphere_user;

--
-- Name: comments; Type: TABLE; Schema: public; Owner: birdsphere_user
--

CREATE TABLE public.comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    author_id uuid NOT NULL,
    content text NOT NULL,
    parent_comment_id uuid,
    reaction_counts jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    reply_count integer DEFAULT 0,
    reaction_count integer DEFAULT 0,
    is_edited boolean DEFAULT false,
    is_hidden boolean DEFAULT false
);


ALTER TABLE public.comments OWNER TO birdsphere_user;

--
-- Name: conversations; Type: TABLE; Schema: public; Owner: birdsphere_user
--

CREATE TABLE public.conversations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    listing_id uuid,
    buyer_id uuid NOT NULL,
    seller_id uuid NOT NULL,
    last_message_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.conversations OWNER TO birdsphere_user;

--
-- Name: follows; Type: TABLE; Schema: public; Owner: birdsphere_user
--

CREATE TABLE public.follows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    follower_id uuid NOT NULL,
    following_id uuid NOT NULL,
    notify_all_posts boolean DEFAULT true,
    notify_important_posts boolean DEFAULT true,
    notify_live_stream boolean DEFAULT true,
    engagement_score numeric(4,2) DEFAULT 1.0,
    last_interaction timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT follows_check CHECK ((follower_id <> following_id))
);


ALTER TABLE public.follows OWNER TO birdsphere_user;

--
-- Name: listing_media; Type: TABLE; Schema: public; Owner: birdsphere_user
--

CREATE TABLE public.listing_media (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    listing_id uuid NOT NULL,
    file_path character varying(500) NOT NULL,
    file_type character varying(20) NOT NULL,
    file_size integer,
    mime_type character varying(100),
    is_primary boolean DEFAULT false,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT listing_media_file_type_check CHECK (((file_type)::text = ANY ((ARRAY['image'::character varying, 'video'::character varying])::text[])))
);


ALTER TABLE public.listing_media OWNER TO birdsphere_user;

--
-- Name: listings; Type: TABLE; Schema: public; Owner: birdsphere_user
--

CREATE TABLE public.listings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    seller_id uuid NOT NULL,
    category_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text NOT NULL,
    price numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'USD'::character varying,
    species character varying(100),
    breed character varying(100),
    age character varying(50),
    sex character varying(20),
    color character varying(100),
    health_status character varying(255),
    vaccination_status character varying(255),
    shipping_available boolean DEFAULT false,
    local_pickup_only boolean DEFAULT true,
    location_city character varying(100),
    location_state character varying(50),
    location_country character varying(50),
    latitude numeric(10,8),
    longitude numeric(11,8),
    status character varying(20) DEFAULT 'active'::character varying,
    featured boolean DEFAULT false,
    views_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT listings_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'sold'::character varying, 'pending'::character varying, 'inactive'::character varying])::text[])))
);


ALTER TABLE public.listings OWNER TO birdsphere_user;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: birdsphere_user
--

CREATE TABLE public.messages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    conversation_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    content text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.messages OWNER TO birdsphere_user;

--
-- Name: moderation_flags; Type: TABLE; Schema: public; Owner: birdsphere_user
--

CREATE TABLE public.moderation_flags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    target_id uuid NOT NULL,
    target_type character varying(10) NOT NULL,
    reason character varying(100) NOT NULL,
    reported_by uuid NOT NULL,
    reported_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) DEFAULT 'pending'::character varying,
    reviewed_by uuid,
    reviewed_at timestamp without time zone,
    notes text,
    CONSTRAINT moderation_flags_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'reviewed'::character varying, 'resolved'::character varying, 'dismissed'::character varying])::text[]))),
    CONSTRAINT moderation_flags_target_type_check CHECK (((target_type)::text = ANY ((ARRAY['post'::character varying, 'comment'::character varying])::text[])))
);


ALTER TABLE public.moderation_flags OWNER TO birdsphere_user;

--
-- Name: post_comments; Type: TABLE; Schema: public; Owner: birdsphere_user
--

CREATE TABLE public.post_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    user_id uuid NOT NULL,
    parent_comment_id uuid,
    content text NOT NULL,
    is_edited boolean DEFAULT false,
    reaction_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.post_comments OWNER TO birdsphere_user;

--
-- Name: post_media; Type: TABLE; Schema: public; Owner: birdsphere_user
--

CREATE TABLE public.post_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    file_type character varying(20) NOT NULL,
    file_url text NOT NULL,
    file_name character varying(255) NOT NULL,
    file_size integer,
    mime_type character varying(100),
    width integer,
    height integer,
    duration integer,
    thumbnail_url text,
    display_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT post_media_file_type_check CHECK (((file_type)::text = ANY ((ARRAY['image'::character varying, 'video'::character varying, 'pdf'::character varying, 'document'::character varying, '3d_model'::character varying, 'audio'::character varying])::text[])))
);


ALTER TABLE public.post_media OWNER TO birdsphere_user;

--
-- Name: post_reactions; Type: TABLE; Schema: public; Owner: birdsphere_user
--

CREATE TABLE public.post_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    user_id uuid NOT NULL,
    reaction_type character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.post_reactions OWNER TO birdsphere_user;

--
-- Name: post_shares; Type: TABLE; Schema: public; Owner: birdsphere_user
--

CREATE TABLE public.post_shares (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    shared_by_user_id uuid NOT NULL,
    share_comment text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.post_shares OWNER TO birdsphere_user;

--
-- Name: posts; Type: TABLE; Schema: public; Owner: birdsphere_user
--

CREATE TABLE public.posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    author_id uuid NOT NULL,
    content text NOT NULL,
    visibility character varying(20) DEFAULT 'public'::character varying,
    media_attachments jsonb DEFAULT '[]'::jsonb,
    reaction_counts jsonb DEFAULT '{}'::jsonb,
    share_count integer DEFAULT 0,
    comment_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    tags text[] DEFAULT '{}'::text[],
    location_city character varying(100),
    location_state character varying(100),
    location_country character varying(100),
    view_count integer DEFAULT 0,
    reach_count integer DEFAULT 0,
    engagement_score integer DEFAULT 0,
    reaction_count integer DEFAULT 0,
    last_engagement timestamp with time zone DEFAULT now(),
    search_keywords text[] DEFAULT '{}'::text[],
    post_type character varying(50) DEFAULT 'standard'::character varying,
    is_pinned boolean DEFAULT false,
    location_lat numeric(10,8),
    location_lng numeric(11,8),
    location_name character varying(255),
    hashtags text[],
    CONSTRAINT posts_visibility_check CHECK (((visibility)::text = ANY ((ARRAY['public'::character varying, 'private'::character varying, 'friends'::character varying, 'followers'::character varying])::text[])))
);


ALTER TABLE public.posts OWNER TO birdsphere_user;

--
-- Name: reactions; Type: TABLE; Schema: public; Owner: birdsphere_user
--

CREATE TABLE public.reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    target_id uuid NOT NULL,
    target_type character varying(20) NOT NULL,
    reaction_type character varying(20) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT reactions_reaction_type_check CHECK (((reaction_type)::text = ANY ((ARRAY['like'::character varying, 'love'::character varying, 'laugh'::character varying, 'wow'::character varying, 'sad'::character varying, 'angry'::character varying, 'hug'::character varying])::text[]))),
    CONSTRAINT reactions_target_type_check CHECK (((target_type)::text = ANY ((ARRAY['post'::character varying, 'comment'::character varying])::text[])))
);


ALTER TABLE public.reactions OWNER TO birdsphere_user;

--
-- Name: shares; Type: TABLE; Schema: public; Owner: birdsphere_user
--

CREATE TABLE public.shares (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    post_id uuid NOT NULL,
    share_comment text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.shares OWNER TO birdsphere_user;

--
-- Name: user_animal_interests; Type: TABLE; Schema: public; Owner: birdsphere_user
--

CREATE TABLE public.user_animal_interests (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    category_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_animal_interests OWNER TO birdsphere_user;

--
-- Name: TABLE user_animal_interests; Type: COMMENT; Schema: public; Owner: birdsphere_user
--

COMMENT ON TABLE public.user_animal_interests IS 'Junction table linking users to their animal interests';


--
-- Name: user_animal_interests_id_seq; Type: SEQUENCE; Schema: public; Owner: birdsphere_user
--

CREATE SEQUENCE public.user_animal_interests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_animal_interests_id_seq OWNER TO birdsphere_user;

--
-- Name: user_animal_interests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: birdsphere_user
--

ALTER SEQUENCE public.user_animal_interests_id_seq OWNED BY public.user_animal_interests.id;


--
-- Name: user_favorites; Type: TABLE; Schema: public; Owner: birdsphere_user
--

CREATE TABLE public.user_favorites (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    listing_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_favorites OWNER TO birdsphere_user;

--
-- Name: user_follows; Type: TABLE; Schema: public; Owner: birdsphere_user
--

CREATE TABLE public.user_follows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    follower_id uuid NOT NULL,
    following_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_follows_check CHECK ((follower_id <> following_id))
);


ALTER TABLE public.user_follows OWNER TO birdsphere_user;

--
-- Name: user_ratings; Type: TABLE; Schema: public; Owner: birdsphere_user
--

CREATE TABLE public.user_ratings (
    id integer NOT NULL,
    rater_id uuid NOT NULL,
    rated_user_id uuid NOT NULL,
    rating integer NOT NULL,
    comment text,
    transaction_type character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_ratings_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.user_ratings OWNER TO birdsphere_user;

--
-- Name: TABLE user_ratings; Type: COMMENT; Schema: public; Owner: birdsphere_user
--

COMMENT ON TABLE public.user_ratings IS 'User ratings and reviews system';


--
-- Name: user_ratings_id_seq; Type: SEQUENCE; Schema: public; Owner: birdsphere_user
--

CREATE SEQUENCE public.user_ratings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_ratings_id_seq OWNER TO birdsphere_user;

--
-- Name: user_ratings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: birdsphere_user
--

ALTER SEQUENCE public.user_ratings_id_seq OWNED BY public.user_ratings.id;


--
-- Name: user_reviews; Type: TABLE; Schema: public; Owner: birdsphere_user
--

CREATE TABLE public.user_reviews (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    reviewer_id uuid NOT NULL,
    reviewed_id uuid NOT NULL,
    listing_id uuid,
    rating integer NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.user_reviews OWNER TO birdsphere_user;

--
-- Name: users; Type: TABLE; Schema: public; Owner: birdsphere_user
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    username character varying(50) NOT NULL,
    phone character varying(20),
    bio text,
    profile_image character varying(255),
    location_city character varying(100),
    location_state character varying(50),
    location_country character varying(50),
    latitude numeric(10,8),
    longitude numeric(11,8),
    is_verified boolean DEFAULT false,
    is_breeder boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_login timestamp with time zone,
    address_street character varying(255),
    address_city character varying(100),
    address_state character varying(100),
    address_country character varying(100),
    address_postal_code character varying(20),
    rating numeric(3,2) DEFAULT 0.00,
    rating_count integer DEFAULT 0,
    user_roles text[] DEFAULT '{}'::text[]
);


ALTER TABLE public.users OWNER TO birdsphere_user;

--
-- Name: COLUMN users.rating; Type: COMMENT; Schema: public; Owner: birdsphere_user
--

COMMENT ON COLUMN public.users.rating IS 'Average rating from other users (1-5 stars)';


--
-- Name: COLUMN users.rating_count; Type: COMMENT; Schema: public; Owner: birdsphere_user
--

COMMENT ON COLUMN public.users.rating_count IS 'Total number of ratings received';


--
-- Name: COLUMN users.user_roles; Type: COMMENT; Schema: public; Owner: birdsphere_user
--

COMMENT ON COLUMN public.users.user_roles IS 'Array of user roles: breeder, buyer, enthusiast, trainer, rescue_operator';


--
-- Name: animal_categories id; Type: DEFAULT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.animal_categories ALTER COLUMN id SET DEFAULT nextval('public.animal_categories_id_seq'::regclass);


--
-- Name: user_animal_interests id; Type: DEFAULT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.user_animal_interests ALTER COLUMN id SET DEFAULT nextval('public.user_animal_interests_id_seq'::regclass);


--
-- Name: user_ratings id; Type: DEFAULT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.user_ratings ALTER COLUMN id SET DEFAULT nextval('public.user_ratings_id_seq'::regclass);


--
-- Data for Name: animal_categories; Type: TABLE DATA; Schema: public; Owner: birdsphere_user
--

COPY public.animal_categories (id, name, parent_id, level, icon, created_at) FROM stdin;
1	Birds	\N	1	🐦	2025-09-16 00:31:45.119691
2	Dogs	\N	1	🐕	2025-09-16 00:31:45.119691
3	Cats	\N	1	🐱	2025-09-16 00:31:45.119691
4	Reptiles	\N	1	🦎	2025-09-16 00:31:45.119691
5	Fish	\N	1	🐠	2025-09-16 00:31:45.119691
6	Farm Animals	\N	1	🐄	2025-09-16 00:31:45.119691
7	Parrots	1	2	🦜	2025-09-16 00:31:45.121724
8	Finches	1	2	🐦	2025-09-16 00:31:45.121724
9	Canaries	1	2	🐤	2025-09-16 00:31:45.121724
10	Cockatiels	1	2	🦜	2025-09-16 00:31:45.121724
11	Budgerigars	1	2	🦜	2025-09-16 00:31:45.121724
12	Doves	1	2	🕊️	2025-09-16 00:31:45.121724
13	Birds of Prey	1	2	🦅	2025-09-16 00:31:45.121724
14	Conures	7	3	🦜	2025-09-16 00:31:45.124625
15	Cockatoos	7	3	🦜	2025-09-16 00:31:45.124625
16	Macaws	7	3	🦜	2025-09-16 00:31:45.124625
17	African Greys	7	3	🦜	2025-09-16 00:31:45.124625
18	Amazons	7	3	🦜	2025-09-16 00:31:45.124625
19	Lovebirds	7	3	🦜	2025-09-16 00:31:45.124625
20	Indian Ringnecks	7	3	🦜	2025-09-16 00:31:45.124625
21	Quaker Parrots	7	3	🦜	2025-09-16 00:31:45.124625
22	Sun Conure	14	4	🦜	2025-09-16 00:31:45.126362
23	Green Cheek Conure	14	4	🦜	2025-09-16 00:31:45.126362
24	Blue Crown Conure	14	4	🦜	2025-09-16 00:31:45.126362
25	Nanday Conure	14	4	🦜	2025-09-16 00:31:45.126362
26	Cherry Head Conure	14	4	🦜	2025-09-16 00:31:45.126362
27	Mitred Conure	14	4	🦜	2025-09-16 00:31:45.126362
28	Jenday Conure	14	4	🦜	2025-09-16 00:31:45.126362
29	Pineapple Conure	14	4	🦜	2025-09-16 00:31:45.126362
30	Cinnamon Conure	14	4	🦜	2025-09-16 00:31:45.126362
31	Gold Cap Conure	14	4	🦜	2025-09-16 00:31:45.126362
32	Red Factor Conure	14	4	🦜	2025-09-16 00:31:45.126362
33	Normal/Wild Type Budgie	11	4	🦜	2025-09-16 00:31:45.128705
34	Lutino Budgie	11	4	🦜	2025-09-16 00:31:45.128705
35	Albino Budgie	11	4	🦜	2025-09-16 00:31:45.128705
36	Blue Budgie	11	4	🦜	2025-09-16 00:31:45.128705
37	Violet Budgie	11	4	🦜	2025-09-16 00:31:45.128705
38	Cinnamon Budgie	11	4	🦜	2025-09-16 00:31:45.128705
39	Opaline Budgie	11	4	🦜	2025-09-16 00:31:45.128705
40	Spangle Budgie	11	4	🦜	2025-09-16 00:31:45.128705
41	Pied Budgie	11	4	🦜	2025-09-16 00:31:45.128705
42	Greywing Budgie	11	4	🦜	2025-09-16 00:31:45.128705
43	Clearwing Budgie	11	4	🦜	2025-09-16 00:31:45.128705
44	Rainbow Budgie	11	4	🦜	2025-09-16 00:31:45.128705
45	Lacewing Budgie	11	4	🦜	2025-09-16 00:31:45.128705
46	Yellowface Budgie	11	4	🦜	2025-09-16 00:31:45.128705
47	English Budgerigar	11	4	🦜	2025-09-16 00:31:45.128705
48	American Budgerigar	11	4	🦜	2025-09-16 00:31:45.128705
49	Green Indian Ringneck	20	4	🦜	2025-09-16 00:31:45.131509
50	Blue Indian Ringneck	20	4	🦜	2025-09-16 00:31:45.131509
51	Turquoise Indian Ringneck	20	4	🦜	2025-09-16 00:31:45.131509
52	Lutino Indian Ringneck	20	4	🦜	2025-09-16 00:31:45.131509
53	Albino Indian Ringneck	20	4	🦜	2025-09-16 00:31:45.131509
54	Violet Indian Ringneck	20	4	🦜	2025-09-16 00:31:45.131509
55	Cinnamon Indian Ringneck	20	4	🦜	2025-09-16 00:31:45.131509
56	Olive Indian Ringneck	20	4	🦜	2025-09-16 00:31:45.131509
57	Grey Indian Ringneck	20	4	🦜	2025-09-16 00:31:45.131509
58	Yellow Indian Ringneck	20	4	🦜	2025-09-16 00:31:45.131509
59	Lacewing Indian Ringneck	20	4	🦜	2025-09-16 00:31:45.131509
60	Alexandrine Parakeet	20	4	🦜	2025-09-16 00:31:45.131509
61	Peach-faced Lovebird	19	4	🦜	2025-09-16 00:31:45.133981
62	Fischer's Lovebird	19	4	🦜	2025-09-16 00:31:45.133981
63	Black-masked Lovebird	19	4	🦜	2025-09-16 00:31:45.133981
64	Nyasa Lovebird	19	4	🦜	2025-09-16 00:31:45.133981
65	Red-faced Lovebird	19	4	🦜	2025-09-16 00:31:45.133981
66	Black-winged Lovebird	19	4	🦜	2025-09-16 00:31:45.133981
67	Madagascar Lovebird	19	4	🦜	2025-09-16 00:31:45.133981
68	Black-collared Lovebird	19	4	🦜	2025-09-16 00:31:45.133981
69	Black-cheeked Lovebird	19	4	🦜	2025-09-16 00:31:45.133981
70	Green Quaker Parrot	21	4	🦜	2025-09-16 00:31:45.135934
71	Blue Quaker Parrot	21	4	🦜	2025-09-16 00:31:45.135934
72	Lutino Quaker Parrot	21	4	🦜	2025-09-16 00:31:45.135934
73	Albino Quaker Parrot	21	4	🦜	2025-09-16 00:31:45.135934
74	Cinnamon Quaker Parrot	21	4	🦜	2025-09-16 00:31:45.135934
75	Pallid Quaker Parrot	21	4	🦜	2025-09-16 00:31:45.135934
76	Turquoise Quaker Parrot	21	4	🦜	2025-09-16 00:31:45.135934
77	Pied Quaker Parrot	21	4	🦜	2025-09-16 00:31:45.135934
78	Fallow Quaker Parrot	21	4	🦜	2025-09-16 00:31:45.135934
79	Song Canaries	9	3	🐤	2025-09-16 00:31:45.137643
80	Color Canaries	9	3	🐤	2025-09-16 00:31:45.137643
81	Type Canaries	9	3	🐤	2025-09-16 00:31:45.137643
82	American Singer Canary	79	4	🐤	2025-09-16 00:31:45.138976
83	German Roller Canary	79	4	🐤	2025-09-16 00:31:45.138976
84	Waterslager Canary	79	4	🐤	2025-09-16 00:31:45.138976
85	Spanish Timbrado Canary	79	4	🐤	2025-09-16 00:31:45.138976
86	Russian Singer Canary	79	4	🐤	2025-09-16 00:31:45.138976
87	Yorkshire Canary	81	4	🐤	2025-09-16 00:31:45.14037
88	Norwich Canary	81	4	🐤	2025-09-16 00:31:45.14037
89	Border Canary	81	4	🐤	2025-09-16 00:31:45.14037
90	Gloster Canary	81	4	🐤	2025-09-16 00:31:45.14037
91	Fife Canary	81	4	🐤	2025-09-16 00:31:45.14037
92	Lizard Canary	81	4	🐤	2025-09-16 00:31:45.14037
93	Crested Canary	81	4	🐤	2025-09-16 00:31:45.14037
94	Scotch Fancy Canary	81	4	🐤	2025-09-16 00:31:45.14037
95	Red Factor Canary	80	4	🐤	2025-09-16 00:31:45.142564
96	Yellow Canary	80	4	🐤	2025-09-16 00:31:45.142564
97	White Canary	80	4	🐤	2025-09-16 00:31:45.142564
98	Bronze Canary	80	4	🐤	2025-09-16 00:31:45.142564
99	Cinnamon Canary	80	4	🐤	2025-09-16 00:31:45.142564
100	Isabel Canary	80	4	🐤	2025-09-16 00:31:45.142564
101	Agate Canary	80	4	🐤	2025-09-16 00:31:45.142564
102	Pastel Canary	80	4	🐤	2025-09-16 00:31:45.142564
103	Umbrella Cockatoo	15	4	🦜	2025-09-16 00:31:45.144452
104	Sulphur-crested Cockatoo	15	4	🦜	2025-09-16 00:31:45.144452
105	Moluccan Cockatoo	15	4	🦜	2025-09-16 00:31:45.144452
106	Goffin Cockatoo	15	4	🦜	2025-09-16 00:31:45.144452
107	Working Dogs	2	2	🐕	2025-09-16 00:31:45.146047
108	Sporting Dogs	2	2	🐕	2025-09-16 00:31:45.146047
109	Toy Dogs	2	2	🐕	2025-09-16 00:31:45.146047
110	Terriers	2	2	🐕	2025-09-16 00:31:45.146047
111	Hounds	2	2	🐕	2025-09-16 00:31:45.146047
112	Herding Dogs	2	2	🐕	2025-09-16 00:31:45.146047
113	Non-Sporting Dogs	2	2	🐕	2025-09-16 00:31:45.146047
114	German Shepherd	107	3	🐕	2025-09-16 00:31:45.148149
115	Rottweiler	107	3	🐕	2025-09-16 00:31:45.148149
116	Doberman Pinscher	107	3	🐕	2025-09-16 00:31:45.148149
117	Boxer	107	3	🐕	2025-09-16 00:31:45.148149
118	Great Dane	107	3	🐕	2025-09-16 00:31:45.148149
119	Siberian Husky	107	3	🐕	2025-09-16 00:31:45.148149
120	Golden Retriever	108	3	🐕	2025-09-16 00:31:45.148149
121	Labrador Retriever	108	3	🐕	2025-09-16 00:31:45.148149
122	German Shorthaired Pointer	108	3	🐕	2025-09-16 00:31:45.148149
123	Cocker Spaniel	108	3	🐕	2025-09-16 00:31:45.148149
124	Chihuahua	109	3	🐕	2025-09-16 00:31:45.148149
125	Pomeranian	109	3	🐕	2025-09-16 00:31:45.148149
126	Yorkshire Terrier	109	3	🐕	2025-09-16 00:31:45.148149
127	Maltese	109	3	🐕	2025-09-16 00:31:45.148149
128	Pug	109	3	🐕	2025-09-16 00:31:45.148149
129	Border Collie	112	3	🐕	2025-09-16 00:31:45.148149
130	Australian Shepherd	112	3	🐕	2025-09-16 00:31:45.148149
131	Beagle	111	3	🐕	2025-09-16 00:31:45.148149
132	Dachshund	111	3	🐕	2025-09-16 00:31:45.148149
133	Bulldog	113	3	🐕	2025-09-16 00:31:45.148149
134	French Bulldog	113	3	🐕	2025-09-16 00:31:45.148149
135	Poodle	113	3	🐕	2025-09-16 00:31:45.148149
136	Shiba Inu	113	3	🐕	2025-09-16 00:31:45.148149
137	Long Hair Cats	3	2	🐱	2025-09-16 00:31:45.150505
138	Short Hair Cats	3	2	🐱	2025-09-16 00:31:45.150505
139	Hairless Cats	3	2	🐱	2025-09-16 00:31:45.150505
140	Persian	137	3	🐱	2025-09-16 00:31:45.151897
141	Maine Coon	137	3	🐱	2025-09-16 00:31:45.151897
142	Ragdoll	137	3	🐱	2025-09-16 00:31:45.151897
143	Norwegian Forest Cat	137	3	🐱	2025-09-16 00:31:45.151897
144	British Shorthair	138	3	🐱	2025-09-16 00:31:45.151897
145	American Shorthair	138	3	🐱	2025-09-16 00:31:45.151897
146	Siamese	138	3	🐱	2025-09-16 00:31:45.151897
147	Russian Blue	138	3	🐱	2025-09-16 00:31:45.151897
148	Scottish Fold	138	3	🐱	2025-09-16 00:31:45.151897
149	Bengal	138	3	🐱	2025-09-16 00:31:45.151897
150	Sphynx	139	3	🐱	2025-09-16 00:31:45.151897
151	Snakes	4	2	🐍	2025-09-16 00:31:45.153595
152	Lizards	4	2	🦎	2025-09-16 00:31:45.153595
153	Turtles	4	2	🐢	2025-09-16 00:31:45.153595
154	Geckos	4	2	🦎	2025-09-16 00:31:45.153595
155	Ball Python	151	3	🐍	2025-09-16 00:31:45.155372
156	Corn Snake	151	3	🐍	2025-09-16 00:31:45.155372
157	Boa Constrictor	151	3	🐍	2025-09-16 00:31:45.155372
158	Bearded Dragon	152	3	🦎	2025-09-16 00:31:45.155372
159	Blue Tongue Skink	152	3	🦎	2025-09-16 00:31:45.155372
160	Green Iguana	152	3	🦎	2025-09-16 00:31:45.155372
161	Leopard Gecko	154	3	🦎	2025-09-16 00:31:45.155372
162	Crested Gecko	154	3	🦎	2025-09-16 00:31:45.155372
163	Red-eared Slider	153	3	🐢	2025-09-16 00:31:45.155372
164	Box Turtle	153	3	🐢	2025-09-16 00:31:45.155372
165	Freshwater Fish	5	2	🐠	2025-09-16 00:31:45.157296
166	Saltwater Fish	5	2	🐠	2025-09-16 00:31:45.157296
167	Goldfish	5	2	🐠	2025-09-16 00:31:45.157296
168	Bettas	5	2	🐠	2025-09-16 00:31:45.157296
169	Angelfish	165	3	🐠	2025-09-16 00:31:45.158599
170	Guppy	165	3	🐠	2025-09-16 00:31:45.158599
171	Molly	165	3	🐠	2025-09-16 00:31:45.158599
172	Tetra	165	3	🐠	2025-09-16 00:31:45.158599
173	Clownfish	166	3	🐠	2025-09-16 00:31:45.158599
174	Tang	166	3	🐠	2025-09-16 00:31:45.158599
175	Wrasse	166	3	🐠	2025-09-16 00:31:45.158599
176	Chickens	6	2	🐔	2025-09-16 00:31:45.160214
177	Goats	6	2	🐐	2025-09-16 00:31:45.160214
178	Sheep	6	2	🐑	2025-09-16 00:31:45.160214
179	Pigs	6	2	🐷	2025-09-16 00:31:45.160214
180	Cattle	6	2	🐄	2025-09-16 00:31:45.160214
181	Horses	6	2	🐴	2025-09-16 00:31:45.160214
182	Ducks	6	2	🦆	2025-09-16 00:31:45.160214
183	Rhode Island Red	176	3	🐔	2025-09-16 00:31:45.161985
184	Leghorn	176	3	🐔	2025-09-16 00:31:45.161985
185	Orpington	176	3	🐔	2025-09-16 00:31:45.161985
186	Silkie	176	3	🐔	2025-09-16 00:31:45.161985
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: birdsphere_user
--

COPY public.categories (id, name, description, parent_id, is_active, created_at) FROM stdin;
2cba5c84-f826-464e-bf29-028b4929a6f8	Birds	All types of birds	\N	t	2025-09-09 18:30:46.342423+00
1261b017-c301-4df3-9ac0-cb6e059fb323	Reptiles	Snakes, lizards, turtles, and other reptiles	\N	t	2025-09-09 18:30:46.342423+00
27dad85d-9a39-4938-baa6-fe9fc853e0d3	Small Mammals	Rabbits, ferrets, guinea pigs, and other small mammals	\N	t	2025-09-09 18:30:46.342423+00
e878671f-b77c-43e9-a1d2-86dd444e9deb	Exotic Pets	Unusual and exotic animals	\N	t	2025-09-09 18:30:46.342423+00
9ffe28bd-6d95-444d-86a6-5706c59bdc71	Parrots	Macaws, cockatoos, conures, and other parrots	2cba5c84-f826-464e-bf29-028b4929a6f8	t	2025-09-09 18:30:46.345068+00
badaabd2-bbb5-4090-9022-53c9fdf633e2	Finches	Canaries, zebra finches, and other finches	2cba5c84-f826-464e-bf29-028b4929a6f8	t	2025-09-09 18:30:46.345068+00
c73f2487-fb38-416c-9683-d293976f0792	Cockatiels	All cockatiel varieties	2cba5c84-f826-464e-bf29-028b4929a6f8	t	2025-09-09 18:30:46.345068+00
9e934c16-9429-418b-839d-d874d2b1bfd6	Budgerigars	Budgies and parakeets	2cba5c84-f826-464e-bf29-028b4929a6f8	t	2025-09-09 18:30:46.345068+00
1dbdea3c-b4ca-4084-ba06-3cf44479787b	Lovebirds	All lovebird species	2cba5c84-f826-464e-bf29-028b4929a6f8	t	2025-09-09 18:30:46.345068+00
ccb8f9a0-0869-4c5b-af81-ce6d23a2cabf	Game Birds	Chickens, quail, and other game birds	2cba5c84-f826-464e-bf29-028b4929a6f8	t	2025-09-09 18:30:46.345068+00
e691cf0c-8e39-4ff4-b8f2-981c561d0f80	Snakes	Ball pythons, corn snakes, and other serpents	1261b017-c301-4df3-9ac0-cb6e059fb323	t	2025-09-09 18:30:46.347461+00
b419e148-9d8c-4cf5-a60a-e8eb9d92c067	Lizards	Bearded dragons, geckos, and other lizards	1261b017-c301-4df3-9ac0-cb6e059fb323	t	2025-09-09 18:30:46.347461+00
d13d7324-fc18-4d60-889b-c9bfe05e3e31	Turtles & Tortoises	Aquatic and terrestrial chelonians	1261b017-c301-4df3-9ac0-cb6e059fb323	t	2025-09-09 18:30:46.347461+00
79de2d86-25b6-4019-b468-691ddd2ea524	Rabbits	Domestic rabbits of all breeds	27dad85d-9a39-4938-baa6-fe9fc853e0d3	t	2025-09-09 18:30:46.348764+00
2dcb0f69-0655-4bf3-b18d-0a5afa9a18c1	Guinea Pigs	Cavies and guinea pig varieties	27dad85d-9a39-4938-baa6-fe9fc853e0d3	t	2025-09-09 18:30:46.348764+00
60fe975b-fe68-4ef6-b9c9-4020098dabde	Ferrets	Domestic ferrets	27dad85d-9a39-4938-baa6-fe9fc853e0d3	t	2025-09-09 18:30:46.348764+00
\.


--
-- Data for Name: comment_edit_history; Type: TABLE DATA; Schema: public; Owner: birdsphere_user
--

COPY public.comment_edit_history (id, comment_id, content, edited_at) FROM stdin;
\.


--
-- Data for Name: comment_reactions; Type: TABLE DATA; Schema: public; Owner: birdsphere_user
--

COPY public.comment_reactions (id, comment_id, user_id, reaction_type, created_at) FROM stdin;
\.


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: birdsphere_user
--

COPY public.comments (id, post_id, author_id, content, parent_comment_id, reaction_counts, created_at, updated_at, is_active, reply_count, reaction_count, is_edited, is_hidden) FROM stdin;
e1235e82-2a65-4579-9593-e90fe9e49cc9	dce2aff8-0ecf-4c9e-86cf-3a19da735a5d	6fdc6f55-a78e-4fe0-86ce-ec13c445cbb7	This is a test comment on the PostgreSQL post!	\N	{}	2025-09-18 02:59:42.828775+00	2025-09-18 02:59:42.828775+00	t	0	0	f	f
4ee8e5b2-1497-4f80-a0dd-047196813297	2b90c3ae-b2ec-496e-9438-30443da26dcf	edc8b839-5e0a-4208-88b8-2d3b7ebf06d8	ythis sucks	\N	{}	2025-09-19 05:25:52.99694+00	2025-09-19 05:25:52.99694+00	t	0	0	f	f
0a60cb1f-2822-433f-ad90-e4ff96365a10	2a871fb6-aabe-435c-85fe-580b7950873a	edc8b839-5e0a-4208-88b8-2d3b7ebf06d8	this is a test comment	\N	{}	2025-09-20 02:43:02.99452+00	2025-09-20 02:43:02.99452+00	t	0	0	f	f
56beb838-cb0f-43b7-b9ac-f2c10fadff09	2a871fb6-aabe-435c-85fe-580b7950873a	edc8b839-5e0a-4208-88b8-2d3b7ebf06d8	trest	\N	{}	2025-09-20 02:45:04.994291+00	2025-09-20 02:45:04.994291+00	t	0	0	f	f
42cd3be5-13d0-4f6b-bcd2-f9396f466ba8	dce2aff8-0ecf-4c9e-86cf-3a19da735a5d	6ffaf59f-981f-4408-87ca-90c08d6703d8	Test comment created directly in database	\N	{}	2025-09-20 02:53:07.09501+00	2025-09-20 02:53:07.09501+00	t	0	0	f	f
e581a318-292d-4406-a025-df3daf084055	2a871fb6-aabe-435c-85fe-580b7950873a	edc8b839-5e0a-4208-88b8-2d3b7ebf06d8	test	\N	{}	2025-09-20 02:53:53.870774+00	2025-09-20 02:53:53.870774+00	t	0	0	f	f
32180cbd-191e-4d4c-b3a8-03a03911ef57	2a871fb6-aabe-435c-85fe-580b7950873a	edc8b839-5e0a-4208-88b8-2d3b7ebf06d8	test	\N	{}	2025-09-20 02:59:15.066051+00	2025-09-20 02:59:15.066051+00	t	0	0	f	f
8103147f-eebb-44af-bf85-3dc58d523cf1	2a871fb6-aabe-435c-85fe-580b7950873a	edc8b839-5e0a-4208-88b8-2d3b7ebf06d8	rest	\N	{}	2025-09-20 05:01:49.270959+00	2025-09-20 05:01:49.270959+00	t	0	0	f	f
8bd565c6-4774-4b64-b17a-107967f96a3c	ee5b4e8c-7552-45e7-bdf7-2674612ce6af	edc8b839-5e0a-4208-88b8-2d3b7ebf06d8	test	\N	{}	2025-09-22 05:51:52.333024+00	2025-09-22 05:51:52.333024+00	t	0	0	f	f
b01b33cf-8343-40b5-ace3-a99c38ebb158	2a871fb6-aabe-435c-85fe-580b7950873a	edc8b839-5e0a-4208-88b8-2d3b7ebf06d8	fff	\N	{}	2025-09-22 05:52:18.676239+00	2025-09-22 05:52:18.676239+00	t	0	0	f	f
\.


--
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: birdsphere_user
--

COPY public.conversations (id, listing_id, buyer_id, seller_id, last_message_at, created_at) FROM stdin;
\.


--
-- Data for Name: follows; Type: TABLE DATA; Schema: public; Owner: birdsphere_user
--

COPY public.follows (id, follower_id, following_id, notify_all_posts, notify_important_posts, notify_live_stream, engagement_score, last_interaction, created_at) FROM stdin;
\.


--
-- Data for Name: listing_media; Type: TABLE DATA; Schema: public; Owner: birdsphere_user
--

COPY public.listing_media (id, listing_id, file_path, file_type, file_size, mime_type, is_primary, display_order, created_at) FROM stdin;
\.


--
-- Data for Name: listings; Type: TABLE DATA; Schema: public; Owner: birdsphere_user
--

COPY public.listings (id, seller_id, category_id, title, description, price, currency, species, breed, age, sex, color, health_status, vaccination_status, shipping_available, local_pickup_only, location_city, location_state, location_country, latitude, longitude, status, featured, views_count, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: birdsphere_user
--

COPY public.messages (id, conversation_id, sender_id, content, is_read, created_at) FROM stdin;
\.


--
-- Data for Name: moderation_flags; Type: TABLE DATA; Schema: public; Owner: birdsphere_user
--

COPY public.moderation_flags (id, target_id, target_type, reason, reported_by, reported_at, status, reviewed_by, reviewed_at, notes) FROM stdin;
\.


--
-- Data for Name: post_comments; Type: TABLE DATA; Schema: public; Owner: birdsphere_user
--

COPY public.post_comments (id, post_id, user_id, parent_comment_id, content, is_edited, reaction_count, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: post_media; Type: TABLE DATA; Schema: public; Owner: birdsphere_user
--

COPY public.post_media (id, post_id, file_type, file_url, file_name, file_size, mime_type, width, height, duration, thumbnail_url, display_order, created_at) FROM stdin;
ebf6f931-31f1-4aca-873c-8f70b174a3bc	ee5b4e8c-7552-45e7-bdf7-2674612ce6af	image	/uploads/57d6ccdb-ca7d-4f4b-918f-7d7ba342c6f9.jpg	4e3e8d65-ed25-4d5d-9349-353759426af6.jpg	92455	image/jpeg	\N	\N	\N	\N	0	2025-09-22 02:47:51.975276
\.


--
-- Data for Name: post_reactions; Type: TABLE DATA; Schema: public; Owner: birdsphere_user
--

COPY public.post_reactions (id, post_id, user_id, reaction_type, created_at) FROM stdin;
\.


--
-- Data for Name: post_shares; Type: TABLE DATA; Schema: public; Owner: birdsphere_user
--

COPY public.post_shares (id, post_id, shared_by_user_id, share_comment, created_at) FROM stdin;
\.


--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: birdsphere_user
--

COPY public.posts (id, author_id, content, visibility, media_attachments, reaction_counts, share_count, comment_count, created_at, updated_at, is_active, tags, location_city, location_state, location_country, view_count, reach_count, engagement_score, reaction_count, last_engagement, search_keywords, post_type, is_pinned, location_lat, location_lng, location_name, hashtags) FROM stdin;
ee5b4e8c-7552-45e7-bdf7-2674612ce6af	edc8b839-5e0a-4208-88b8-2d3b7ebf06d8		public	[]	{}	0	1	2025-09-22 02:47:51.975276+00	2025-09-22 05:51:52.338886+00	t	{}	\N	\N	\N	0	0	0	0	2025-09-22 02:47:51.975276+00	{}	standard	f	\N	\N	\N	\N
2a871fb6-aabe-435c-85fe-580b7950873a	edc8b839-5e0a-4208-88b8-2d3b7ebf06d8	This is a new post	public	[]	{"like": 1}	0	6	2025-09-20 01:35:00.702165+00	2025-09-22 05:52:18.682059+00	t	{}	\N	\N	\N	0	0	0	0	2025-09-20 01:35:00.702165+00	{}	standard	f	\N	\N	\N	\N
2b90c3ae-b2ec-496e-9438-30443da26dcf	6fdc6f55-a78e-4fe0-86ce-ec13c445cbb7	UPDATED: Full API test post - PostgreSQL migration verification! ✅ (Modified)	public	[]	{"hug": 1}	0	1	2025-09-18 03:06:29.958365+00	2025-09-21 02:06:41.827065+00	t	{}	\N	\N	\N	1	0	0	0	2025-09-18 03:07:51.862744+00	{}	standard	f	\N	\N	\N	\N
dce2aff8-0ecf-4c9e-86cf-3a19da735a5d	6fdc6f55-a78e-4fe0-86ce-ec13c445cbb7	This is a test post to verify PostgreSQL posting works!	public	[]	{"like": 2}	0	2	2025-09-18 02:55:40.100637+00	2025-09-21 14:47:38.569428+00	t	{}	\N	\N	\N	1	0	0	0	2025-09-18 02:59:19.414694+00	{}	standard	f	\N	\N	\N	\N
dbd7bbd2-5feb-4988-9184-acedfc8dc0e5	edc8b839-5e0a-4208-88b8-2d3b7ebf06d8	test	public	[]	{}	0	0	2025-09-22 02:47:32.523122+00	2025-09-22 02:47:32.523122+00	t	{}	\N	\N	\N	0	0	0	0	2025-09-22 02:47:32.523122+00	{}	standard	f	\N	\N	\N	\N
\.


--
-- Data for Name: reactions; Type: TABLE DATA; Schema: public; Owner: birdsphere_user
--

COPY public.reactions (id, user_id, target_id, target_type, reaction_type, created_at) FROM stdin;
0153e2cd-e8fe-483c-b2f5-d075a7438d69	6fdc6f55-a78e-4fe0-86ce-ec13c445cbb7	dce2aff8-0ecf-4c9e-86cf-3a19da735a5d	post	like	2025-09-18 03:00:05.324784+00
cbf2e3bb-1dda-4419-83d1-88bb3c7529d6	edc8b839-5e0a-4208-88b8-2d3b7ebf06d8	2b90c3ae-b2ec-496e-9438-30443da26dcf	post	hug	2025-09-19 05:15:43.659179+00
167f3356-8cd3-4b8f-935f-30ae34e9c3fa	edc8b839-5e0a-4208-88b8-2d3b7ebf06d8	dce2aff8-0ecf-4c9e-86cf-3a19da735a5d	post	like	2025-09-21 14:47:38.563077+00
fce27f84-ecd7-4469-9392-57567226e8b5	edc8b839-5e0a-4208-88b8-2d3b7ebf06d8	3fc4e28b-47d0-4484-ba1a-46771e9eed01	post	like	2025-09-21 19:32:03.545567+00
61f16ec7-6569-41af-83f3-702d821cf484	edc8b839-5e0a-4208-88b8-2d3b7ebf06d8	2a871fb6-aabe-435c-85fe-580b7950873a	post	like	2025-09-20 01:35:15.386682+00
b4c1110e-85d6-43af-9a8e-0f6a8382f833	edc8b839-5e0a-4208-88b8-2d3b7ebf06d8	98005e1b-bbc2-4295-9caa-2514b8273773	post	love	2025-09-22 02:38:09.263072+00
\.


--
-- Data for Name: shares; Type: TABLE DATA; Schema: public; Owner: birdsphere_user
--

COPY public.shares (id, user_id, post_id, share_comment, created_at) FROM stdin;
\.


--
-- Data for Name: user_animal_interests; Type: TABLE DATA; Schema: public; Owner: birdsphere_user
--

COPY public.user_animal_interests (id, user_id, category_id, created_at) FROM stdin;
7	6ffaf59f-981f-4408-87ca-90c08d6703d8	4	2025-09-16 00:45:29.876519
8	6ffaf59f-981f-4408-87ca-90c08d6703d8	5	2025-09-16 00:45:29.876519
9	6ffaf59f-981f-4408-87ca-90c08d6703d8	6	2025-09-16 00:45:29.876519
46	edc8b839-5e0a-4208-88b8-2d3b7ebf06d8	80	2025-09-19 05:48:05.70445
47	edc8b839-5e0a-4208-88b8-2d3b7ebf06d8	150	2025-09-19 05:48:05.70445
48	edc8b839-5e0a-4208-88b8-2d3b7ebf06d8	48	2025-09-19 05:48:05.70445
49	edc8b839-5e0a-4208-88b8-2d3b7ebf06d8	36	2025-09-19 05:48:05.70445
50	edc8b839-5e0a-4208-88b8-2d3b7ebf06d8	38	2025-09-19 05:48:05.70445
\.


--
-- Data for Name: user_favorites; Type: TABLE DATA; Schema: public; Owner: birdsphere_user
--

COPY public.user_favorites (id, user_id, listing_id, created_at) FROM stdin;
\.


--
-- Data for Name: user_follows; Type: TABLE DATA; Schema: public; Owner: birdsphere_user
--

COPY public.user_follows (id, follower_id, following_id, created_at) FROM stdin;
\.


--
-- Data for Name: user_ratings; Type: TABLE DATA; Schema: public; Owner: birdsphere_user
--

COPY public.user_ratings (id, rater_id, rated_user_id, rating, comment, transaction_type, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_reviews; Type: TABLE DATA; Schema: public; Owner: birdsphere_user
--

COPY public.user_reviews (id, reviewer_id, reviewed_id, listing_id, rating, comment, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: birdsphere_user
--

COPY public.users (id, email, password_hash, first_name, last_name, username, phone, bio, profile_image, location_city, location_state, location_country, latitude, longitude, is_verified, is_breeder, created_at, updated_at, last_login, address_street, address_city, address_state, address_country, address_postal_code, rating, rating_count, user_roles) FROM stdin;
6ffaf59f-981f-4408-87ca-90c08d6703d8	debug@test.com	$2b$12$garGH0dKtvg3SVFFZamAcOwzOgL5ZDQvPrYuvtGAeDhGVZ2bQJaLm	Success Test	Updated User	debuguser	\N	\N	\N	\N	\N	\N	\N	\N	f	f	2025-09-16 00:41:05.090729+00	2025-09-16 00:45:29.869679+00	\N	\N	Test City	\N	\N	\N	0.00	0	{breeder,buyer}
6fdc6f55-a78e-4fe0-86ce-ec13c445cbb7	testuser@birdsphere.com	$2b$12$lcWqCPtWAd/8Byb.fDSHP.yuB8o1azNiCrFicMO8LkILgUN62v786	API	Tester	apitester	\N	\N	\N	\N	\N	\N	\N	\N	f	f	2025-09-18 02:55:19.861481+00	2025-09-18 02:55:19.861481+00	2025-09-18 03:05:39.625355+00	\N	\N	\N	\N	\N	0.00	0	{buyer}
4371cb43-515e-4384-bc02-3ec138280e51	test@example.com	$2b$12$i97fWtivQebqHy6RA1n7seWZcTVvgOFYLk3KVLVYrbwZAaMiSegqy	Test	User	testuser	\N	\N	\N	\N	\N	\N	\N	\N	f	f	2025-09-18 01:49:26.017112+00	2025-09-18 01:49:26.017112+00	2025-09-18 13:33:23.102131+00	\N	\N	\N	\N	\N	0.00	0	{buyer}
6b415f19-e367-40ce-bfed-55003a98b7c2	test_1758079569696@example.com	$2b$12$z1iZCnnP5IIaZvtOzGlhnO8GFJm9kYjH2KHv8ekVE5xiwtagStvMG	Test	User	testuser_1758079569696	\N	\N	\N	\N	\N	\N	\N	\N	f	f	2025-09-17 03:26:09.971755+00	2025-09-17 03:26:09.971755+00	\N	\N	\N	\N	\N	\N	0.00	0	{buyer}
edc8b839-5e0a-4208-88b8-2d3b7ebf06d8	jschvat@gmail.com	$2b$12$.7HxI84Xky4xt653YYok9elIONQMfqi6aLyFihNUwCNJJkLHovHLe	jason	chvat	jschvat	9518345303		/uploads/avatars/9867223d-5755-4b84-b5b8-b98159a186dd.jpg	riverside	ca	usa	\N	\N	f	t	2025-09-12 01:47:15.240872+00	2025-09-19 05:48:05.701125+00	2025-09-21 02:15:56.308208+00	\N	\N	\N	\N	\N	0.00	0	{buyer,trainer,rescue_operator,enthusiast}
05856a9f-3296-41f5-a2bf-9ad33d33bfc9	remembermetest@example.com	$2b$12$8DkH3BxBZjR5YuEFooXSKOTly3PVaJM7fUrLlB6ZNZ1c/wqQsQYtm	Remember	Test	remembertest	\N	\N	\N	\N	\N	\N	\N	\N	f	f	2025-09-21 02:12:45.387161+00	2025-09-21 02:12:45.387161+00	2025-09-21 02:16:31.161287+00	\N	\N	\N	\N	\N	0.00	0	{buyer}
\.


--
-- Name: animal_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: birdsphere_user
--

SELECT pg_catalog.setval('public.animal_categories_id_seq', 186, true);


--
-- Name: user_animal_interests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: birdsphere_user
--

SELECT pg_catalog.setval('public.user_animal_interests_id_seq', 50, true);


--
-- Name: user_ratings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: birdsphere_user
--

SELECT pg_catalog.setval('public.user_ratings_id_seq', 1, false);


--
-- Name: animal_categories animal_categories_name_parent_id_key; Type: CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.animal_categories
    ADD CONSTRAINT animal_categories_name_parent_id_key UNIQUE (name, parent_id);


--
-- Name: animal_categories animal_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.animal_categories
    ADD CONSTRAINT animal_categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: comment_edit_history comment_edit_history_pkey; Type: CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.comment_edit_history
    ADD CONSTRAINT comment_edit_history_pkey PRIMARY KEY (id);


--
-- Name: comment_reactions comment_reactions_comment_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.comment_reactions
    ADD CONSTRAINT comment_reactions_comment_id_user_id_key UNIQUE (comment_id, user_id);


--
-- Name: comment_reactions comment_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.comment_reactions
    ADD CONSTRAINT comment_reactions_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_buyer_id_seller_id_listing_id_key; Type: CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_buyer_id_seller_id_listing_id_key UNIQUE (buyer_id, seller_id, listing_id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: follows follows_follower_id_following_id_key; Type: CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_follower_id_following_id_key UNIQUE (follower_id, following_id);


--
-- Name: follows follows_pkey; Type: CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_pkey PRIMARY KEY (id);


--
-- Name: listing_media listing_media_pkey; Type: CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.listing_media
    ADD CONSTRAINT listing_media_pkey PRIMARY KEY (id);


--
-- Name: listings listings_pkey; Type: CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT listings_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: moderation_flags moderation_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.moderation_flags
    ADD CONSTRAINT moderation_flags_pkey PRIMARY KEY (id);


--
-- Name: post_comments post_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.post_comments
    ADD CONSTRAINT post_comments_pkey PRIMARY KEY (id);


--
-- Name: post_media post_media_pkey; Type: CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.post_media
    ADD CONSTRAINT post_media_pkey PRIMARY KEY (id);


--
-- Name: post_reactions post_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.post_reactions
    ADD CONSTRAINT post_reactions_pkey PRIMARY KEY (id);


--
-- Name: post_reactions post_reactions_post_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.post_reactions
    ADD CONSTRAINT post_reactions_post_id_user_id_key UNIQUE (post_id, user_id);


--
-- Name: post_shares post_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.post_shares
    ADD CONSTRAINT post_shares_pkey PRIMARY KEY (id);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: reactions reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.reactions
    ADD CONSTRAINT reactions_pkey PRIMARY KEY (id);


--
-- Name: reactions reactions_user_id_target_id_target_type_key; Type: CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.reactions
    ADD CONSTRAINT reactions_user_id_target_id_target_type_key UNIQUE (user_id, target_id, target_type);


--
-- Name: shares shares_pkey; Type: CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.shares
    ADD CONSTRAINT shares_pkey PRIMARY KEY (id);


--
-- Name: shares shares_user_id_post_id_key; Type: CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.shares
    ADD CONSTRAINT shares_user_id_post_id_key UNIQUE (user_id, post_id);


--
-- Name: user_animal_interests user_animal_interests_pkey; Type: CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.user_animal_interests
    ADD CONSTRAINT user_animal_interests_pkey PRIMARY KEY (id);


--
-- Name: user_animal_interests user_animal_interests_user_id_category_id_key; Type: CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.user_animal_interests
    ADD CONSTRAINT user_animal_interests_user_id_category_id_key UNIQUE (user_id, category_id);


--
-- Name: user_favorites user_favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT user_favorites_pkey PRIMARY KEY (id);


--
-- Name: user_favorites user_favorites_user_id_listing_id_key; Type: CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT user_favorites_user_id_listing_id_key UNIQUE (user_id, listing_id);


--
-- Name: user_follows user_follows_follower_id_following_id_key; Type: CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.user_follows
    ADD CONSTRAINT user_follows_follower_id_following_id_key UNIQUE (follower_id, following_id);


--
-- Name: user_follows user_follows_pkey; Type: CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.user_follows
    ADD CONSTRAINT user_follows_pkey PRIMARY KEY (id);


--
-- Name: user_ratings user_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.user_ratings
    ADD CONSTRAINT user_ratings_pkey PRIMARY KEY (id);


--
-- Name: user_ratings user_ratings_rater_id_rated_user_id_transaction_type_key; Type: CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.user_ratings
    ADD CONSTRAINT user_ratings_rater_id_rated_user_id_transaction_type_key UNIQUE (rater_id, rated_user_id, transaction_type);


--
-- Name: user_reviews user_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.user_reviews
    ADD CONSTRAINT user_reviews_pkey PRIMARY KEY (id);


--
-- Name: user_reviews user_reviews_reviewer_id_reviewed_id_listing_id_key; Type: CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.user_reviews
    ADD CONSTRAINT user_reviews_reviewer_id_reviewed_id_listing_id_key UNIQUE (reviewer_id, reviewed_id, listing_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_animal_categories_level; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_animal_categories_level ON public.animal_categories USING btree (level);


--
-- Name: idx_animal_categories_parent_id; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_animal_categories_parent_id ON public.animal_categories USING btree (parent_id);


--
-- Name: idx_comments_author_id; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_comments_author_id ON public.comments USING btree (author_id);


--
-- Name: idx_comments_created_at; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_comments_created_at ON public.comments USING btree (created_at DESC);


--
-- Name: idx_comments_parent; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_comments_parent ON public.comments USING btree (parent_comment_id);


--
-- Name: idx_comments_parent_comment_id; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_comments_parent_comment_id ON public.comments USING btree (parent_comment_id);


--
-- Name: idx_comments_post_id; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_comments_post_id ON public.comments USING btree (post_id);


--
-- Name: idx_conversations_buyer; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_conversations_buyer ON public.conversations USING btree (buyer_id);


--
-- Name: idx_conversations_seller; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_conversations_seller ON public.conversations USING btree (seller_id);


--
-- Name: idx_follows_engagement; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_follows_engagement ON public.follows USING btree (follower_id, engagement_score DESC);


--
-- Name: idx_follows_follower; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_follows_follower ON public.follows USING btree (follower_id, created_at DESC);


--
-- Name: idx_follows_following; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_follows_following ON public.follows USING btree (following_id, created_at DESC);


--
-- Name: idx_listing_media_listing; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_listing_media_listing ON public.listing_media USING btree (listing_id);


--
-- Name: idx_listings_category; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_listings_category ON public.listings USING btree (category_id);


--
-- Name: idx_listings_category_location; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_listings_category_location ON public.listings USING btree (category_id, latitude, longitude) WHERE ((latitude IS NOT NULL) AND (longitude IS NOT NULL));


--
-- Name: idx_listings_created; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_listings_created ON public.listings USING btree (created_at DESC);


--
-- Name: idx_listings_location; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_listings_location ON public.listings USING btree (latitude, longitude);


--
-- Name: idx_listings_location_not_null; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_listings_location_not_null ON public.listings USING btree (latitude, longitude) WHERE ((latitude IS NOT NULL) AND (longitude IS NOT NULL));


--
-- Name: idx_listings_seller; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_listings_seller ON public.listings USING btree (seller_id);


--
-- Name: idx_listings_status; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_listings_status ON public.listings USING btree (status);


--
-- Name: idx_listings_status_location; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_listings_status_location ON public.listings USING btree (status, latitude, longitude) WHERE ((latitude IS NOT NULL) AND (longitude IS NOT NULL));


--
-- Name: idx_messages_conversation; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_messages_conversation ON public.messages USING btree (conversation_id);


--
-- Name: idx_messages_created; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_messages_created ON public.messages USING btree (created_at);


--
-- Name: idx_moderation_flags_status; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_moderation_flags_status ON public.moderation_flags USING btree (status, reported_at DESC);


--
-- Name: idx_moderation_flags_target; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_moderation_flags_target ON public.moderation_flags USING btree (target_id, target_type);


--
-- Name: idx_post_media_post_id; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_post_media_post_id ON public.post_media USING btree (post_id);


--
-- Name: idx_post_media_post_order; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_post_media_post_order ON public.post_media USING btree (post_id, display_order);


--
-- Name: idx_posts_active; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_posts_active ON public.posts USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_posts_author_id; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_posts_author_id ON public.posts USING btree (author_id);


--
-- Name: idx_posts_created_at; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_posts_created_at ON public.posts USING btree (created_at DESC);


--
-- Name: idx_posts_visibility; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_posts_visibility ON public.posts USING btree (visibility);


--
-- Name: idx_reactions_target; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_reactions_target ON public.reactions USING btree (target_id, target_type);


--
-- Name: idx_reactions_type; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_reactions_type ON public.reactions USING btree (reaction_type);


--
-- Name: idx_reactions_user; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_reactions_user ON public.reactions USING btree (user_id);


--
-- Name: idx_shares_created_at; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_shares_created_at ON public.shares USING btree (created_at DESC);


--
-- Name: idx_shares_post_id; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_shares_post_id ON public.shares USING btree (post_id);


--
-- Name: idx_shares_user_id; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_shares_user_id ON public.shares USING btree (user_id);


--
-- Name: idx_user_animal_interests_category_id; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_user_animal_interests_category_id ON public.user_animal_interests USING btree (category_id);


--
-- Name: idx_user_animal_interests_user_id; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_user_animal_interests_user_id ON public.user_animal_interests USING btree (user_id);


--
-- Name: idx_user_favorites_user; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_user_favorites_user ON public.user_favorites USING btree (user_id);


--
-- Name: idx_user_ratings_rated_user_id; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_user_ratings_rated_user_id ON public.user_ratings USING btree (rated_user_id);


--
-- Name: idx_user_ratings_rater_id; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_user_ratings_rater_id ON public.user_ratings USING btree (rater_id);


--
-- Name: idx_user_reviews_reviewed; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_user_reviews_reviewed ON public.user_reviews USING btree (reviewed_id);


--
-- Name: idx_users_breeders_location; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_users_breeders_location ON public.users USING btree (latitude, longitude) WHERE ((is_breeder = true) AND (latitude IS NOT NULL) AND (longitude IS NOT NULL));


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_location; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_users_location ON public.users USING btree (latitude, longitude);


--
-- Name: idx_users_location_not_null; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_users_location_not_null ON public.users USING btree (latitude, longitude) WHERE ((latitude IS NOT NULL) AND (longitude IS NOT NULL));


--
-- Name: idx_users_rating; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_users_rating ON public.users USING btree (rating);


--
-- Name: idx_users_roles_location; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_users_roles_location ON public.users USING btree (user_roles, latitude, longitude) WHERE ((latitude IS NOT NULL) AND (longitude IS NOT NULL));


--
-- Name: idx_users_user_roles; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_users_user_roles ON public.users USING gin (user_roles);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: birdsphere_user
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: user_ratings trigger_update_user_rating; Type: TRIGGER; Schema: public; Owner: birdsphere_user
--

CREATE TRIGGER trigger_update_user_rating AFTER INSERT OR DELETE OR UPDATE ON public.user_ratings FOR EACH ROW EXECUTE FUNCTION public.update_user_rating();


--
-- Name: comments update_comments_updated_at; Type: TRIGGER; Schema: public; Owner: birdsphere_user
--

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: posts update_posts_updated_at; Type: TRIGGER; Schema: public; Owner: birdsphere_user
--

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: animal_categories animal_categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.animal_categories
    ADD CONSTRAINT animal_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.animal_categories(id);


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id);


--
-- Name: comment_reactions comment_reactions_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.comment_reactions
    ADD CONSTRAINT comment_reactions_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.post_comments(id) ON DELETE CASCADE;


--
-- Name: comment_reactions comment_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.comment_reactions
    ADD CONSTRAINT comment_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: comments comments_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: comments comments_parent_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: comments comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: conversations conversations_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: conversations conversations_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE SET NULL;


--
-- Name: conversations conversations_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: follows follows_follower_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: follows follows_following_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: listing_media listing_media_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.listing_media
    ADD CONSTRAINT listing_media_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;


--
-- Name: listings listings_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT listings_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: listings listings_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT listings_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: moderation_flags moderation_flags_reported_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.moderation_flags
    ADD CONSTRAINT moderation_flags_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: moderation_flags moderation_flags_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.moderation_flags
    ADD CONSTRAINT moderation_flags_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: post_comments post_comments_parent_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.post_comments
    ADD CONSTRAINT post_comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.post_comments(id) ON DELETE CASCADE;


--
-- Name: post_comments post_comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.post_comments
    ADD CONSTRAINT post_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: post_comments post_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.post_comments
    ADD CONSTRAINT post_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: post_reactions post_reactions_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.post_reactions
    ADD CONSTRAINT post_reactions_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: post_reactions post_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.post_reactions
    ADD CONSTRAINT post_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: post_shares post_shares_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.post_shares
    ADD CONSTRAINT post_shares_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: post_shares post_shares_shared_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.post_shares
    ADD CONSTRAINT post_shares_shared_by_user_id_fkey FOREIGN KEY (shared_by_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: posts posts_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reactions reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.reactions
    ADD CONSTRAINT reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: shares shares_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.shares
    ADD CONSTRAINT shares_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: shares shares_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.shares
    ADD CONSTRAINT shares_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_animal_interests user_animal_interests_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.user_animal_interests
    ADD CONSTRAINT user_animal_interests_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.animal_categories(id) ON DELETE CASCADE;


--
-- Name: user_animal_interests user_animal_interests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.user_animal_interests
    ADD CONSTRAINT user_animal_interests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_favorites user_favorites_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT user_favorites_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;


--
-- Name: user_favorites user_favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT user_favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_follows user_follows_follower_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.user_follows
    ADD CONSTRAINT user_follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_follows user_follows_following_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.user_follows
    ADD CONSTRAINT user_follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_ratings user_ratings_rated_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.user_ratings
    ADD CONSTRAINT user_ratings_rated_user_id_fkey FOREIGN KEY (rated_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_ratings user_ratings_rater_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.user_ratings
    ADD CONSTRAINT user_ratings_rater_id_fkey FOREIGN KEY (rater_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_reviews user_reviews_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.user_reviews
    ADD CONSTRAINT user_reviews_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE SET NULL;


--
-- Name: user_reviews user_reviews_reviewed_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.user_reviews
    ADD CONSTRAINT user_reviews_reviewed_id_fkey FOREIGN KEY (reviewed_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_reviews user_reviews_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: birdsphere_user
--

ALTER TABLE ONLY public.user_reviews
    ADD CONSTRAINT user_reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict QJ5ouv0d4eRtQhLds4hzTp9AG7hOjIJ6gYvWxNo91KPxaZjluWvyYlwltR9TRH6

