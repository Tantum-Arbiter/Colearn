package com.app.model;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for InteractiveElement model
 * Tests validation, getters/setters, and nested classes
 */
class InteractiveElementTest {

    private InteractiveElement interactiveElement;

    @BeforeEach
    void setUp() {
        interactiveElement = new InteractiveElement();
        interactiveElement.setId("door");
        interactiveElement.setType("reveal");
        interactiveElement.setImage("assets/stories/test/page-2/door-open.webp");
    }

    @Test
    @DisplayName("Should create InteractiveElement with default constructor")
    void testDefaultConstructor() {
        InteractiveElement element = new InteractiveElement();
        assertNotNull(element);
        assertNull(element.getId());
        assertNull(element.getType());
        assertNull(element.getImage());
    }

    @Test
    @DisplayName("Should create InteractiveElement with parameterized constructor")
    void testParameterizedConstructor() {
        InteractiveElement element = new InteractiveElement("basket", "reveal", "assets/basket.webp");
        
        assertEquals("basket", element.getId());
        assertEquals("reveal", element.getType());
        assertEquals("assets/basket.webp", element.getImage());
    }

    @Test
    @DisplayName("Should set and get id")
    void testIdGetterSetter() {
        interactiveElement.setId("new-id");
        assertEquals("new-id", interactiveElement.getId());
    }

    @Test
    @DisplayName("Should set and get type")
    void testTypeGetterSetter() {
        interactiveElement.setType("toggle");
        assertEquals("toggle", interactiveElement.getType());
    }

    @Test
    @DisplayName("Should set and get image")
    void testImageGetterSetter() {
        String imagePath = "assets/stories/test/props/new-image.webp";
        interactiveElement.setImage(imagePath);
        assertEquals(imagePath, interactiveElement.getImage());
    }

    @Test
    @DisplayName("Should set and get position")
    void testPositionGetterSetter() {
        InteractiveElement.Position position = new InteractiveElement.Position(0.5, 0.75);
        interactiveElement.setPosition(position);
        
        assertNotNull(interactiveElement.getPosition());
        assertEquals(0.5, interactiveElement.getPosition().getX());
        assertEquals(0.75, interactiveElement.getPosition().getY());
    }

    @Test
    @DisplayName("Should set and get size")
    void testSizeGetterSetter() {
        InteractiveElement.Size size = new InteractiveElement.Size(0.25, 0.30);
        interactiveElement.setSize(size);
        
        assertNotNull(interactiveElement.getSize());
        assertEquals(0.25, interactiveElement.getSize().getWidth());
        assertEquals(0.30, interactiveElement.getSize().getHeight());
    }

    @Test
    @DisplayName("Should set and get hitArea")
    void testHitAreaGetterSetter() {
        InteractiveElement.HitArea hitArea = new InteractiveElement.HitArea();
        hitArea.setX(0.4);
        hitArea.setY(0.3);
        hitArea.setWidth(0.3);
        hitArea.setHeight(0.4);
        
        interactiveElement.setHitArea(hitArea);
        
        assertNotNull(interactiveElement.getHitArea());
        assertEquals(0.4, interactiveElement.getHitArea().getX());
        assertEquals(0.3, interactiveElement.getHitArea().getY());
        assertEquals(0.3, interactiveElement.getHitArea().getWidth());
        assertEquals(0.4, interactiveElement.getHitArea().getHeight());
    }

    @Test
    @DisplayName("Should compare elements by id")
    void testEquals() {
        InteractiveElement element1 = new InteractiveElement("door", "reveal", "image1.webp");
        InteractiveElement element2 = new InteractiveElement("door", "toggle", "image2.webp");
        InteractiveElement element3 = new InteractiveElement("basket", "reveal", "image1.webp");
        
        assertEquals(element1, element2); // Same ID
        assertNotEquals(element1, element3); // Different ID
    }

    @Test
    @DisplayName("Should generate consistent hashCode")
    void testHashCode() {
        InteractiveElement element1 = new InteractiveElement("door", "reveal", "image1.webp");
        InteractiveElement element2 = new InteractiveElement("door", "toggle", "image2.webp");
        
        assertEquals(element1.hashCode(), element2.hashCode());
    }

    @Test
    @DisplayName("Should generate meaningful toString")
    void testToString() {
        String str = interactiveElement.toString();
        
        assertTrue(str.contains("door"));
        assertTrue(str.contains("reveal"));
        assertTrue(str.contains("door-open.webp"));
    }

    // Nested class tests
    
    @Test
    @DisplayName("Position - should create with default constructor")
    void testPositionDefaultConstructor() {
        InteractiveElement.Position pos = new InteractiveElement.Position();
        assertEquals(0.0, pos.getX());
        assertEquals(0.0, pos.getY());
    }

    @Test
    @DisplayName("Position - should create with parameterized constructor")
    void testPositionParameterizedConstructor() {
        InteractiveElement.Position pos = new InteractiveElement.Position(0.481, 0.337);
        assertEquals(0.481, pos.getX());
        assertEquals(0.337, pos.getY());
    }

    @Test
    @DisplayName("Size - should create with default constructor")
    void testSizeDefaultConstructor() {
        InteractiveElement.Size size = new InteractiveElement.Size();
        assertEquals(0.0, size.getWidth());
        assertEquals(0.0, size.getHeight());
    }

    @Test
    @DisplayName("Size - should create with parameterized constructor")
    void testSizeParameterizedConstructor() {
        InteractiveElement.Size size = new InteractiveElement.Size(0.273, 0.301);
        assertEquals(0.273, size.getWidth());
        assertEquals(0.301, size.getHeight());
    }
}

