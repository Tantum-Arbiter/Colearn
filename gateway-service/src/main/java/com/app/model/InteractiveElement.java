package com.app.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.cloud.firestore.annotation.PropertyName;

import java.util.Objects;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class InteractiveElement {

    @JsonProperty("id")
    @PropertyName("id")
    private String id;

    @JsonProperty("type")
    @PropertyName("type")
    private String type;

    @JsonProperty("image")
    @PropertyName("image")
    private String image;

    @JsonProperty("position")
    @PropertyName("position")
    private Position position;

    @JsonProperty("size")
    @PropertyName("size")
    private Size size;

    @JsonProperty("hitArea")
    @PropertyName("hitArea")
    private HitArea hitArea;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Position {
        @JsonProperty("x")
        @PropertyName("x")
        private double x;

        @JsonProperty("y")
        @PropertyName("y")
        private double y;

        public Position() {}

        public Position(double x, double y) {
            this.x = x;
            this.y = y;
        }

        @PropertyName("x")
        public double getX() { return x; }
        @PropertyName("x")
        public void setX(double x) { this.x = x; }
        @PropertyName("y")
        public double getY() { return y; }
        @PropertyName("y")
        public void setY(double y) { this.y = y; }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Size {
        @JsonProperty("width")
        @PropertyName("width")
        private double width;

        @JsonProperty("height")
        @PropertyName("height")
        private double height;

        public Size() {}

        public Size(double width, double height) {
            this.width = width;
            this.height = height;
        }

        @PropertyName("width")
        public double getWidth() { return width; }
        @PropertyName("width")
        public void setWidth(double width) { this.width = width; }
        @PropertyName("height")
        public double getHeight() { return height; }
        @PropertyName("height")
        public void setHeight(double height) { this.height = height; }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class HitArea {
        @JsonProperty("x")
        @PropertyName("x")
        private double x;

        @JsonProperty("y")
        @PropertyName("y")
        private double y;

        @JsonProperty("width")
        @PropertyName("width")
        private double width;

        @JsonProperty("height")
        @PropertyName("height")
        private double height;

        public HitArea() {}

        @PropertyName("x")
        public double getX() { return x; }
        @PropertyName("x")
        public void setX(double x) { this.x = x; }
        @PropertyName("y")
        public double getY() { return y; }
        @PropertyName("y")
        public void setY(double y) { this.y = y; }
        @PropertyName("width")
        public double getWidth() { return width; }
        @PropertyName("width")
        public void setWidth(double width) { this.width = width; }
        @PropertyName("height")
        public double getHeight() { return height; }
        @PropertyName("height")
        public void setHeight(double height) { this.height = height; }
    }

    public InteractiveElement() {}

    public InteractiveElement(String id, String type, String image) {
        this.id = id;
        this.type = type;
        this.image = image;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getImage() { return image; }
    public void setImage(String image) { this.image = image; }

    public Position getPosition() { return position; }
    public void setPosition(Position position) { this.position = position; }

    public Size getSize() { return size; }
    public void setSize(Size size) { this.size = size; }

    public HitArea getHitArea() { return hitArea; }
    public void setHitArea(HitArea hitArea) { this.hitArea = hitArea; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        InteractiveElement that = (InteractiveElement) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "InteractiveElement{" +
                "id='" + id + '\'' +
                ", type='" + type + '\'' +
                ", image='" + image + '\'' +
                '}';
    }
}

