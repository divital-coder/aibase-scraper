use anyhow::Result;
use chrono::{Duration, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use super::models::{
    Article, ArticlePreview, NewArticle, ScrapeRun, ScrapeStatus, ScrapeType, ScraperSetting,
    Stats, TagStat,
};
use crate::scraper::{Source, SourceInfo};

// Article queries

pub async fn get_articles(
    pool: &PgPool,
    page: i64,
    per_page: i64,
    search: Option<&str>,
    tag: Option<&str>,
    source: Option<&str>,
) -> Result<(Vec<ArticlePreview>, i64)> {
    let offset = (page - 1) * per_page;

    // Build dynamic query based on filters
    let (count, articles) = match (search, tag, source) {
        (Some(search_term), _, Some(src)) => {
            let count: (i64,) = sqlx::query_as(
                "SELECT COUNT(*) FROM articles WHERE search_vector @@ plainto_tsquery('english', $1) AND source = $2",
            )
            .bind(search_term)
            .bind(src)
            .fetch_one(pool)
            .await?;

            let articles: Vec<Article> = sqlx::query_as(
                r#"
                SELECT * FROM articles
                WHERE search_vector @@ plainto_tsquery('english', $1) AND source = $2
                ORDER BY published_at DESC NULLS LAST
                LIMIT $3 OFFSET $4
                "#,
            )
            .bind(search_term)
            .bind(src)
            .bind(per_page)
            .bind(offset)
            .fetch_all(pool)
            .await?;

            (count.0, articles)
        }
        (Some(search_term), _, None) => {
            let count: (i64,) = sqlx::query_as(
                "SELECT COUNT(*) FROM articles WHERE search_vector @@ plainto_tsquery('english', $1)",
            )
            .bind(search_term)
            .fetch_one(pool)
            .await?;

            let articles: Vec<Article> = sqlx::query_as(
                r#"
                SELECT * FROM articles
                WHERE search_vector @@ plainto_tsquery('english', $1)
                ORDER BY published_at DESC NULLS LAST
                LIMIT $2 OFFSET $3
                "#,
            )
            .bind(search_term)
            .bind(per_page)
            .bind(offset)
            .fetch_all(pool)
            .await?;

            (count.0, articles)
        }
        (None, Some(tag_name), Some(src)) => {
            let count: (i64,) = sqlx::query_as(
                r#"
                SELECT COUNT(DISTINCT a.id) FROM articles a
                JOIN article_tags at ON a.id = at.article_id
                JOIN tags t ON at.tag_id = t.id
                WHERE t.name = $1 AND a.source = $2
                "#,
            )
            .bind(tag_name)
            .bind(src)
            .fetch_one(pool)
            .await?;

            let articles: Vec<Article> = sqlx::query_as(
                r#"
                SELECT DISTINCT a.* FROM articles a
                JOIN article_tags at ON a.id = at.article_id
                JOIN tags t ON at.tag_id = t.id
                WHERE t.name = $1 AND a.source = $2
                ORDER BY a.published_at DESC NULLS LAST
                LIMIT $3 OFFSET $4
                "#,
            )
            .bind(tag_name)
            .bind(src)
            .bind(per_page)
            .bind(offset)
            .fetch_all(pool)
            .await?;

            (count.0, articles)
        }
        (None, Some(tag_name), None) => {
            let count: (i64,) = sqlx::query_as(
                r#"
                SELECT COUNT(DISTINCT a.id) FROM articles a
                JOIN article_tags at ON a.id = at.article_id
                JOIN tags t ON at.tag_id = t.id
                WHERE t.name = $1
                "#,
            )
            .bind(tag_name)
            .fetch_one(pool)
            .await?;

            let articles: Vec<Article> = sqlx::query_as(
                r#"
                SELECT DISTINCT a.* FROM articles a
                JOIN article_tags at ON a.id = at.article_id
                JOIN tags t ON at.tag_id = t.id
                WHERE t.name = $1
                ORDER BY a.published_at DESC NULLS LAST
                LIMIT $2 OFFSET $3
                "#,
            )
            .bind(tag_name)
            .bind(per_page)
            .bind(offset)
            .fetch_all(pool)
            .await?;

            (count.0, articles)
        }
        (None, None, Some(src)) => {
            let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM articles WHERE source = $1")
                .bind(src)
                .fetch_one(pool)
                .await?;

            let articles: Vec<Article> = sqlx::query_as(
                r#"
                SELECT * FROM articles
                WHERE source = $1
                ORDER BY published_at DESC NULLS LAST
                LIMIT $2 OFFSET $3
                "#,
            )
            .bind(src)
            .bind(per_page)
            .bind(offset)
            .fetch_all(pool)
            .await?;

            (count.0, articles)
        }
        (None, None, None) => {
            let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM articles")
                .fetch_one(pool)
                .await?;

            let articles: Vec<Article> = sqlx::query_as(
                r#"
                SELECT * FROM articles
                ORDER BY published_at DESC NULLS LAST
                LIMIT $1 OFFSET $2
                "#,
            )
            .bind(per_page)
            .bind(offset)
            .fetch_all(pool)
            .await?;

            (count.0, articles)
        }
    };

    let mut previews = Vec::new();
    for article in articles {
        let tags = get_article_tags(pool, article.id).await?;
        previews.push(ArticlePreview {
            id: article.id,
            external_id: article.external_id,
            title: article.title,
            excerpt: article.excerpt,
            published_at: article.published_at,
            thumbnail_url: article.thumbnail_url,
            view_count: article.view_count,
            tags,
            source: article.source.unwrap_or_else(|| "AIBase".to_string()),
        });
    }

    Ok((previews, count))
}

pub async fn get_article_by_id(pool: &PgPool, id: Uuid) -> Result<Option<Article>> {
    let article = sqlx::query_as::<_, Article>("SELECT * FROM articles WHERE id = $1")
        .bind(id)
        .fetch_optional(pool)
        .await?;

    Ok(article)
}

pub async fn get_article_by_external_id(pool: &PgPool, external_id: &str) -> Result<Option<Article>> {
    let article = sqlx::query_as::<_, Article>("SELECT * FROM articles WHERE external_id = $1")
        .bind(external_id)
        .fetch_optional(pool)
        .await?;

    Ok(article)
}

pub async fn article_exists(pool: &PgPool, source: &str, external_id: &str) -> Result<bool> {
    let result: (bool,) =
        sqlx::query_as("SELECT EXISTS(SELECT 1 FROM articles WHERE source = $1 AND external_id = $2)")
            .bind(source)
            .bind(external_id)
            .fetch_one(pool)
            .await?;

    Ok(result.0)
}

pub async fn insert_article(pool: &PgPool, article: &NewArticle) -> Result<Uuid> {
    let id: (Uuid,) = sqlx::query_as(
        r#"
        INSERT INTO articles (
            external_id, url, title, content, excerpt, author, source,
            published_at, view_count, read_time_minutes, thumbnail_url, content_hash
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
        "#,
    )
    .bind(&article.external_id)
    .bind(&article.url)
    .bind(&article.title)
    .bind(&article.content)
    .bind(&article.excerpt)
    .bind(&article.author)
    .bind(&article.source)
    .bind(article.published_at)
    .bind(article.view_count)
    .bind(article.read_time_minutes)
    .bind(&article.thumbnail_url)
    .bind(&article.content_hash)
    .fetch_one(pool)
    .await?;

    // Insert tags
    for tag_name in &article.tags {
        let tag_id = get_or_create_tag(pool, tag_name).await?;
        sqlx::query("INSERT INTO article_tags (article_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING")
            .bind(id.0)
            .bind(tag_id)
            .execute(pool)
            .await?;
    }

    Ok(id.0)
}

pub async fn update_article(pool: &PgPool, source: &str, external_id: &str, article: &NewArticle) -> Result<()> {
    sqlx::query(
        r#"
        UPDATE articles SET
            title = $3, content = $4, excerpt = $5, author = $6,
            published_at = $7, view_count = $8, read_time_minutes = $9,
            thumbnail_url = $10, content_hash = $11
        WHERE source = $1 AND external_id = $2
        "#,
    )
    .bind(source)
    .bind(external_id)
    .bind(&article.title)
    .bind(&article.content)
    .bind(&article.excerpt)
    .bind(&article.author)
    .bind(article.published_at)
    .bind(article.view_count)
    .bind(article.read_time_minutes)
    .bind(&article.thumbnail_url)
    .bind(&article.content_hash)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn delete_article(pool: &PgPool, id: Uuid) -> Result<bool> {
    let result = sqlx::query("DELETE FROM articles WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;

    Ok(result.rows_affected() > 0)
}

// Tag queries

pub async fn get_or_create_tag(pool: &PgPool, name: &str) -> Result<i32> {
    let existing: Option<(i32,)> = sqlx::query_as("SELECT id FROM tags WHERE name = $1")
        .bind(name)
        .fetch_optional(pool)
        .await?;

    if let Some((id,)) = existing {
        return Ok(id);
    }

    let id: (i32,) = sqlx::query_as("INSERT INTO tags (name) VALUES ($1) RETURNING id")
        .bind(name)
        .fetch_one(pool)
        .await?;

    Ok(id.0)
}

pub async fn get_article_tags(pool: &PgPool, article_id: Uuid) -> Result<Vec<String>> {
    let tags: Vec<(String,)> = sqlx::query_as(
        r#"
        SELECT t.name FROM tags t
        JOIN article_tags at ON t.id = at.tag_id
        WHERE at.article_id = $1
        "#,
    )
    .bind(article_id)
    .fetch_all(pool)
    .await?;

    Ok(tags.into_iter().map(|(name,)| name).collect())
}

// Scrape run queries

pub async fn create_scrape_run(
    pool: &PgPool,
    scrape_type: ScrapeType,
    config: Option<serde_json::Value>,
) -> Result<Uuid> {
    let id: (Uuid,) = sqlx::query_as(
        "INSERT INTO scrape_runs (scrape_type, config) VALUES ($1, $2) RETURNING id",
    )
    .bind(scrape_type)
    .bind(config)
    .fetch_one(pool)
    .await?;

    Ok(id.0)
}

pub async fn update_scrape_run_progress(
    pool: &PgPool,
    id: Uuid,
    pages_scraped: i32,
    articles_found: i32,
    articles_new: i32,
    articles_failed: i32,
) -> Result<()> {
    sqlx::query(
        r#"
        UPDATE scrape_runs SET
            pages_scraped = $2, articles_found = $3, articles_new = $4, articles_failed = $5
        WHERE id = $1
        "#,
    )
    .bind(id)
    .bind(pages_scraped)
    .bind(articles_found)
    .bind(articles_new)
    .bind(articles_failed)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn complete_scrape_run(pool: &PgPool, id: Uuid, status: ScrapeStatus) -> Result<()> {
    sqlx::query("UPDATE scrape_runs SET status = $2, completed_at = NOW() WHERE id = $1")
        .bind(id)
        .bind(status)
        .execute(pool)
        .await?;

    Ok(())
}

pub async fn get_scrape_runs(pool: &PgPool, limit: i64) -> Result<Vec<ScrapeRun>> {
    let runs = sqlx::query_as::<_, ScrapeRun>(
        "SELECT * FROM scrape_runs ORDER BY started_at DESC LIMIT $1",
    )
    .bind(limit)
    .fetch_all(pool)
    .await?;

    Ok(runs)
}

pub async fn get_running_scrape(pool: &PgPool) -> Result<Option<ScrapeRun>> {
    let run = sqlx::query_as::<_, ScrapeRun>(
        "SELECT * FROM scrape_runs WHERE status = 'running' ORDER BY started_at DESC LIMIT 1",
    )
    .fetch_optional(pool)
    .await?;

    Ok(run)
}

// Stats queries

pub async fn get_stats(pool: &PgPool) -> Result<Stats> {
    let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM articles")
        .fetch_one(pool)
        .await?;

    let today = Utc::now().date_naive();
    let today_count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM articles WHERE DATE(scraped_at) = $1",
    )
    .bind(today)
    .fetch_one(pool)
    .await?;

    let week_ago = Utc::now() - Duration::days(7);
    let week_count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM articles WHERE scraped_at >= $1",
    )
    .bind(week_ago)
    .fetch_one(pool)
    .await?;

    let last_scrape: Option<(chrono::DateTime<Utc>,)> = sqlx::query_as(
        "SELECT started_at FROM scrape_runs WHERE status = 'completed' ORDER BY started_at DESC LIMIT 1",
    )
    .fetch_optional(pool)
    .await?;

    let total_runs: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM scrape_runs")
        .fetch_one(pool)
        .await?;

    Ok(Stats {
        total_articles: total.0,
        articles_today: today_count.0,
        articles_this_week: week_count.0,
        last_scrape: last_scrape.map(|(dt,)| dt),
        total_scrape_runs: total_runs.0,
    })
}

pub async fn get_tag_stats(pool: &PgPool, limit: i64) -> Result<Vec<TagStat>> {
    let stats: Vec<(String, i64)> = sqlx::query_as(
        r#"
        SELECT t.name, COUNT(*) as count FROM tags t
        JOIN article_tags at ON t.id = at.tag_id
        GROUP BY t.name
        ORDER BY count DESC
        LIMIT $1
        "#,
    )
    .bind(limit)
    .fetch_all(pool)
    .await?;

    Ok(stats
        .into_iter()
        .map(|(name, count)| TagStat { name, count })
        .collect())
}

// Settings queries

pub async fn get_all_settings(pool: &PgPool) -> Result<Vec<ScraperSetting>> {
    let settings = sqlx::query_as::<_, ScraperSetting>("SELECT * FROM scraper_settings")
        .fetch_all(pool)
        .await?;

    Ok(settings)
}

pub async fn get_setting(pool: &PgPool, key: &str) -> Result<Option<ScraperSetting>> {
    let setting = sqlx::query_as::<_, ScraperSetting>(
        "SELECT * FROM scraper_settings WHERE key = $1",
    )
    .bind(key)
    .fetch_optional(pool)
    .await?;

    Ok(setting)
}

pub async fn update_setting(pool: &PgPool, key: &str, value: serde_json::Value) -> Result<bool> {
    let result = sqlx::query(
        "UPDATE scraper_settings SET value = $2, updated_at = NOW() WHERE key = $1",
    )
    .bind(key)
    .bind(value)
    .execute(pool)
    .await?;

    Ok(result.rows_affected() > 0)
}

// Source queries

pub fn get_sources() -> Vec<SourceInfo> {
    Source::all().into_iter().map(|s| s.info()).collect()
}
