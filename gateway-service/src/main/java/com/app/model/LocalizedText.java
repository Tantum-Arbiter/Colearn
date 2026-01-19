package com.app.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

/**
 * Represents localized text content for stories.
 * Stores translations for multiple languages.
 *
 * Supported languages: en (English), pl (Polish), es (Spanish), de (German),
 * fr (French), it (Italian), pt (Portuguese), ja (Japanese), ar (Arabic),
 * tr (Turkish), nl (Dutch), da (Danish), la (Latin), zh (Simplified Chinese)
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class LocalizedText {

    @JsonProperty("en")
    private String en;

    @JsonProperty("pl")
    private String pl;

    @JsonProperty("es")
    private String es;

    @JsonProperty("de")
    private String de;

    @JsonProperty("fr")
    private String fr;

    @JsonProperty("it")
    private String it;

    @JsonProperty("pt")
    private String pt;

    @JsonProperty("ja")
    private String ja;

    @JsonProperty("ar")
    private String ar;

    @JsonProperty("tr")
    private String tr;

    @JsonProperty("nl")
    private String nl;

    @JsonProperty("da")
    private String da;

    @JsonProperty("la")
    private String la;

    @JsonProperty("zh")
    private String zh;

    // Default constructor
    public LocalizedText() {}

    // Constructor with English only (fallback)
    public LocalizedText(String en) {
        this.en = en;
    }

    // Constructor with all languages
    public LocalizedText(String en, String pl, String es, String de, String fr, String it,
                         String pt, String ja, String ar, String tr, String nl, String da,
                         String la, String zh) {
        this.en = en;
        this.pl = pl;
        this.es = es;
        this.de = de;
        this.fr = fr;
        this.it = it;
        this.pt = pt;
        this.ja = ja;
        this.ar = ar;
        this.tr = tr;
        this.nl = nl;
        this.da = da;
        this.la = la;
        this.zh = zh;
    }

    /**
     * Get text for the specified language code.
     * Falls back to English if the requested language is not available.
     *
     * @param languageCode ISO 639-1 language code (e.g., "en", "pl", "es", "de", "fr", "it", etc.)
     * @return The localized text, or English fallback, or null if no text available
     */
    public String getText(String languageCode) {
        if (languageCode == null) {
            return en;
        }

        switch (languageCode.toLowerCase()) {
            case "pl":
                return pl != null ? pl : en;
            case "es":
                return es != null ? es : en;
            case "de":
                return de != null ? de : en;
            case "fr":
                return fr != null ? fr : en;
            case "it":
                return it != null ? it : en;
            case "pt":
                return pt != null ? pt : en;
            case "ja":
                return ja != null ? ja : en;
            case "ar":
                return ar != null ? ar : en;
            case "tr":
                return tr != null ? tr : en;
            case "nl":
                return nl != null ? nl : en;
            case "da":
                return da != null ? da : en;
            case "la":
                return la != null ? la : en;
            case "zh":
                return zh != null ? zh : en;
            case "en":
            default:
                return en;
        }
    }

    /**
     * Convert to a Map for Firestore storage
     */
    public Map<String, String> toMap() {
        Map<String, String> map = new HashMap<>();
        if (en != null) map.put("en", en);
        if (pl != null) map.put("pl", pl);
        if (es != null) map.put("es", es);
        if (de != null) map.put("de", de);
        if (fr != null) map.put("fr", fr);
        if (it != null) map.put("it", it);
        if (pt != null) map.put("pt", pt);
        if (ja != null) map.put("ja", ja);
        if (ar != null) map.put("ar", ar);
        if (tr != null) map.put("tr", tr);
        if (nl != null) map.put("nl", nl);
        if (da != null) map.put("da", da);
        if (la != null) map.put("la", la);
        if (zh != null) map.put("zh", zh);
        return map;
    }

    /**
     * Create from a Map (from Firestore)
     */
    public static LocalizedText fromMap(Map<String, String> map) {
        if (map == null) return null;
        LocalizedText text = new LocalizedText();
        text.setEn(map.get("en"));
        text.setPl(map.get("pl"));
        text.setEs(map.get("es"));
        text.setDe(map.get("de"));
        text.setFr(map.get("fr"));
        text.setIt(map.get("it"));
        text.setPt(map.get("pt"));
        text.setJa(map.get("ja"));
        text.setAr(map.get("ar"));
        text.setTr(map.get("tr"));
        text.setNl(map.get("nl"));
        text.setDa(map.get("da"));
        text.setLa(map.get("la"));
        text.setZh(map.get("zh"));
        return text;
    }

    // Getters and Setters
    public String getEn() { return en; }
    public void setEn(String en) { this.en = en; }

    public String getPl() { return pl; }
    public void setPl(String pl) { this.pl = pl; }

    public String getEs() { return es; }
    public void setEs(String es) { this.es = es; }

    public String getDe() { return de; }
    public void setDe(String de) { this.de = de; }

    public String getFr() { return fr; }
    public void setFr(String fr) { this.fr = fr; }

    public String getIt() { return it; }
    public void setIt(String it) { this.it = it; }

    public String getPt() { return pt; }
    public void setPt(String pt) { this.pt = pt; }

    public String getJa() { return ja; }
    public void setJa(String ja) { this.ja = ja; }

    public String getAr() { return ar; }
    public void setAr(String ar) { this.ar = ar; }

    public String getTr() { return tr; }
    public void setTr(String tr) { this.tr = tr; }

    public String getNl() { return nl; }
    public void setNl(String nl) { this.nl = nl; }

    public String getDa() { return da; }
    public void setDa(String da) { this.da = da; }

    public String getLa() { return la; }
    public void setLa(String la) { this.la = la; }

    public String getZh() { return zh; }
    public void setZh(String zh) { this.zh = zh; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        LocalizedText that = (LocalizedText) o;
        return Objects.equals(en, that.en) &&
               Objects.equals(pl, that.pl) &&
               Objects.equals(es, that.es) &&
               Objects.equals(de, that.de) &&
               Objects.equals(fr, that.fr) &&
               Objects.equals(it, that.it) &&
               Objects.equals(pt, that.pt) &&
               Objects.equals(ja, that.ja) &&
               Objects.equals(ar, that.ar) &&
               Objects.equals(tr, that.tr) &&
               Objects.equals(nl, that.nl) &&
               Objects.equals(da, that.da) &&
               Objects.equals(la, that.la) &&
               Objects.equals(zh, that.zh);
    }

    @Override
    public int hashCode() {
        return Objects.hash(en, pl, es, de, fr, it, pt, ja, ar, tr, nl, da, la, zh);
    }

    @Override
    public String toString() {
        return "LocalizedText{en='" + en + "'}";
    }
}

