// CSS selectors for AIBase website

// Listing page selectors
pub const LISTING_ARTICLE_CARD: &str = "a[href^='/news/']";
pub const LISTING_ARTICLE_TITLE: &str = "h2, h3, .title";
pub const LISTING_ARTICLE_EXCERPT: &str = "p, .excerpt, .description";
pub const LISTING_ARTICLE_DATE: &str = "time, .date, [datetime]";
pub const LISTING_ARTICLE_THUMBNAIL: &str = "img";

// Article page selectors
pub const ARTICLE_TITLE: &str = "h1";
pub const ARTICLE_CONTENT: &str = "article, .article-content, .content, .post-content, main";
pub const ARTICLE_PARAGRAPHS: &str = "p";
pub const ARTICLE_DATE: &str = "time, [datetime], .date, .published";
pub const ARTICLE_AUTHOR: &str = ".author, .byline, [rel='author']";
pub const ARTICLE_TAGS: &str = ".tag, .tags a, [rel='tag']";
pub const ARTICLE_VIEW_COUNT: &str = ".views, .view-count, .read-count";
pub const ARTICLE_THUMBNAIL: &str = "meta[property='og:image'], .featured-image img, article img";

// Base URLs
pub const BASE_URL: &str = "https://news.aibase.com";
pub const NEWS_LISTING_URL: &str = "https://news.aibase.com/news";
