create table if not exists categories
(
    id   bigint unsigned auto_increment primary key,
    name varchar(255) not null
);

create table if not exists audio_source
(
    id         bigint unsigned auto_increment primary key,
    source_uri varchar(1000),
    origin     varchar(100),
    created    timestamp default CURRENT_TIMESTAMP
);

create table if not exists posts
(
    id              bigint unsigned auto_increment primary key,
    title           varchar(1000) not null,
    description     varchar(2000) null,
    body            text          null,
    is_audio        boolean         default false,
    audio_source_id bigint unsigned,
    is_gallery      boolean         default false,
    images          JSON          null,
    has_tips        boolean         default false,
    tips            JSON            default null,
    likes           bigint unsigned default 0,
    live            bigint unsigned default 0,
    created         timestamp       default CURRENT_TIMESTAMP,
    updated         timestamp       default CURRENT_TIMESTAMP on update CURRENT_TIMESTAMP,
    category_id     bigint unsigned,
    FULLTEXT (title, description, body),
    CONSTRAINT fk_category_id FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE,
    CONSTRAINT fk_audio_source_id FOREIGN KEY (audio_source_id) REFERENCES audio_source (id) ON DELETE CASCADE
);

create table if not exists featured_posts
(
    id      bigint unsigned primary key auto_increment,
    post_id bigint unsigned,
    CONSTRAINT fk_posts_id_post_id FOREIGN KEY (post_id) REFERENCES posts (id)
);

create table if not exists users
(
    id  bigint unsigned auto_increment primary key,
    sub JSON
);

create table if not exists user_saw_posts
(
    user_id bigint unsigned,
    post_id bigint unsigned,
    CONSTRAINT fk_user_saw_posts_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_saw_posts_post_id FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
);

create table if not exists user_post_likes
(
    user_id bigint unsigned,
    post_id bigint unsigned,
    CONSTRAINT fk_user_post_likes_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_post_likes_post_id FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
);

create table if not exists live_listen
(
    post_id bigint unsigned,
    counter bigint unsigned default 0,
    CONSTRAINT fk_live_listen_post_id FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
);

create table if not exists reported_bugs
(
    id      bigint unsigned primary key auto_increment,
    message text,
    user_id bigint unsigned,
    CONSTRAINT fk_reported_bugs_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
