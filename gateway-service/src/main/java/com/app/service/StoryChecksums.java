package com.app.service;

import com.fasterxml.jackson.databind.JsonNode;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;

public final class StoryChecksums {

    private static final Set<String> IGNORED_FIELDS = Set.of("checksum", "createdAt", "updatedAt", "version");

    private StoryChecksums() {
    }

    public static String of(JsonNode story) {
        StringBuilder content = new StringBuilder("{");
        List<String> keys = new ArrayList<>();
        story.fieldNames().forEachRemaining(keys::add);
        keys.sort(null);
        boolean first = true;
        for (String key : keys) {
            if (IGNORED_FIELDS.contains(key)) {
                continue;
            }
            if (!first) {
                content.append(',');
            }
            first = false;
            appendString(content, key);
            content.append(':');
            append(content, story.get(key));
        }
        content.append('}');
        return sha256(content.toString());
    }

    public static String canonicalJson(JsonNode value) {
        StringBuilder out = new StringBuilder();
        append(out, value);
        return out.toString();
    }

    private static void append(StringBuilder out, JsonNode value) {
        if (value == null || value.isNull()) {
            out.append("null");
        } else if (value.isObject()) {
            List<String> keys = new ArrayList<>();
            value.fieldNames().forEachRemaining(keys::add);
            keys.sort(null);
            out.append('{');
            for (int i = 0; i < keys.size(); i++) {
                if (i > 0) {
                    out.append(',');
                }
                appendString(out, keys.get(i));
                out.append(':');
                append(out, value.get(keys.get(i)));
            }
            out.append('}');
        } else if (value.isArray()) {
            out.append('[');
            for (int i = 0; i < value.size(); i++) {
                if (i > 0) {
                    out.append(',');
                }
                append(out, value.get(i));
            }
            out.append(']');
        } else if (value.isTextual()) {
            appendString(out, value.textValue());
        } else if (value.isBoolean()) {
            out.append(value.booleanValue());
        } else if (value.isNumber()) {
            out.append(javaScriptNumber(value));
        } else {
            appendString(out, value.asText());
        }
    }

    private static String javaScriptNumber(JsonNode value) {
        if (value.isIntegralNumber()) {
            return value.bigIntegerValue().toString();
        }
        double number = value.doubleValue();
        if (number == 0) {
            return "0";
        }
        double magnitude = Math.abs(number);
        BigDecimal exact = new BigDecimal(Double.toString(number)).stripTrailingZeros();
        if (magnitude >= 1e-6 && magnitude < 1e21) {
            return exact.toPlainString();
        }
        String digits = exact.unscaledValue().abs().toString();
        int exponent = digits.length() - 1 - exact.scale();
        String mantissa = digits.length() == 1 ? digits : digits.charAt(0) + "." + digits.substring(1);
        return (number < 0 ? "-" : "") + mantissa + "e" + (exponent >= 0 ? "+" : "") + exponent;
    }

    private static void appendString(StringBuilder out, String text) {
        out.append('"');
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            switch (c) {
                case '"' -> out.append("\\\"");
                case '\\' -> out.append("\\\\");
                case '\b' -> out.append("\\b");
                case '\f' -> out.append("\\f");
                case '\n' -> out.append("\\n");
                case '\r' -> out.append("\\r");
                case '\t' -> out.append("\\t");
                default -> {
                    if (c < 0x20 || (Character.isSurrogate(c) && !isPairedSurrogate(text, i))) {
                        out.append(String.format("\\u%04x", (int) c));
                    } else {
                        out.append(c);
                    }
                }
            }
        }
        out.append('"');
    }

    private static boolean isPairedSurrogate(String text, int index) {
        char c = text.charAt(index);
        if (Character.isHighSurrogate(c)) {
            return index + 1 < text.length() && Character.isLowSurrogate(text.charAt(index + 1));
        }
        return index > 0 && Character.isHighSurrogate(text.charAt(index - 1));
    }

    private static String sha256(String content) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(content.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }
}
