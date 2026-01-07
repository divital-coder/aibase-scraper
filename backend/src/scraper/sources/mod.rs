pub mod aibase;
pub mod smolai;

use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Source {
    AIBase,
    SmolAI,
}

impl Source {
    pub fn base_url(&self) -> &'static str {
        match self {
            Source::AIBase => "https://news.aibase.com",
            Source::SmolAI => "https://news.smol.ai",
        }
    }

    pub fn display_name(&self) -> &'static str {
        match self {
            Source::AIBase => "AIBase",
            Source::SmolAI => "smol.ai",
        }
    }

    pub fn id(&self) -> &'static str {
        match self {
            Source::AIBase => "aibase",
            Source::SmolAI => "smolai",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "aibase" => Some(Source::AIBase),
            "smolai" | "smol.ai" | "smol" => Some(Source::SmolAI),
            _ => None,
        }
    }

    pub fn all() -> Vec<Source> {
        vec![Source::AIBase, Source::SmolAI]
    }

    pub fn info(&self) -> SourceInfo {
        SourceInfo::from(*self)
    }
}

impl fmt::Display for Source {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.display_name())
    }
}

impl Default for Source {
    fn default() -> Self {
        Source::AIBase
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceInfo {
    pub id: String,
    pub name: String,
    pub base_url: String,
}

impl From<Source> for SourceInfo {
    fn from(source: Source) -> Self {
        SourceInfo {
            id: source.id().to_string(),
            name: source.display_name().to_string(),
            base_url: source.base_url().to_string(),
        }
    }
}
