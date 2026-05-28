// 💎 MILLION DOLLAR IDEA: Article Translation Button
// This button opens articles with AI translation overlay on external websites

import { useLanguage } from "../contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import TranslatedText from "./TranslatedText";

export default function MillionDollarArticleButton({
  article,
  isStartup = false,
  className = "btn",
  style = {},
}) {
  const { currentLanguage, isEnglish } = useLanguage();
  const navigate = useNavigate();

  const handleArticleClick = (e) => {
    e.preventDefault();

    const hasId = article && article.id && article.id !== "unknown";
    const baseId = hasId ? article.id : "unknown";
    const urlParam = article?.url
      ? `?url=${encodeURIComponent(article.url)}`
      : "";

    // Route through the internal Article page so behavior matches card clicks
    navigate(`/article/${baseId}${urlParam}`);
  };

  const defaultStyle = isStartup
    ? {
        background: "rgba(255, 20, 147, 0.2)",
        border: "1px solid rgba(255, 20, 147, 0.3)",
        color: "#ff1493",
        fontSize: "0.8rem",
      }
    : {};

  const buttonStyle = { ...defaultStyle, ...style };

  return (
    <button
      onClick={handleArticleClick}
      className={className}
      style={buttonStyle}
      title={
        isEnglish
          ? "Read Article"
          : `🌍 Read with ${currentLanguage.toUpperCase()} translation`
      }
    >
      {isEnglish ? (
        <>🔗 <TranslatedText>Read Article</TranslatedText></>
      ) : (
        <>🌍 <TranslatedText>Read</TranslatedText> ({currentLanguage.toUpperCase()})</>
      )}
    </button>
  );
}
