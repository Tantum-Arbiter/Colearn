/**
 * Styles for main menu components
 */

import { StyleSheet } from 'react-native';
import { LAYOUT, VISUAL_EFFECTS } from './constants';

export const mainMenuStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: LAYOUT.Z_INDEX.BACKGROUND,
  },
  
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingBottom: 120,
    zIndex: LAYOUT.Z_INDEX.UI,
  },
  
  menuContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: LAYOUT.ICON_CONTAINER_WIDTH,
  },
  
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: LAYOUT.TOP_ROW_MARGIN_BOTTOM,
  },
  
  centerIcon: {
    marginBottom: LAYOUT.CENTER_MARGIN_BOTTOM,
  },
  
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  
  settingsButton: {
    position: 'absolute',
    top: 60,
    right: 30,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: LAYOUT.Z_INDEX.UI + 1,
  },
  
  settingsEmoji: {
    fontSize: 24,
  },
  
  // Animated background elements
  balloonContainer: {
    position: 'absolute',
    zIndex: LAYOUT.Z_INDEX.BALLOONS_BEHIND,
  },
  
  balloonContainerFront: {
    position: 'absolute',
    zIndex: LAYOUT.Z_INDEX.BALLOONS_FRONT,
  },
  
  rocketContainer: {
    position: 'absolute',
    zIndex: LAYOUT.Z_INDEX.ROCKETS,
  },
  
  bearContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: '15%',
    zIndex: LAYOUT.Z_INDEX.BEAR,
  },
  
  // Stars
  star: {
    position: 'absolute',
    width: VISUAL_EFFECTS.STAR_SIZE,
    height: VISUAL_EFFECTS.STAR_SIZE,
    backgroundColor: '#FFFFFF',
    borderRadius: VISUAL_EFFECTS.STAR_BORDER_RADIUS,
    opacity: VISUAL_EFFECTS.STAR_BASE_OPACITY,
  },
});

export const menuIconStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  icon: {
    width: LAYOUT.MENU_ICON_SIZE,
    height: LAYOUT.MENU_ICON_SIZE,
    borderRadius: LAYOUT.MENU_ICON_SIZE / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  
  largeIcon: {
    width: LAYOUT.LARGE_MENU_ICON_SIZE,
    height: LAYOUT.LARGE_MENU_ICON_SIZE,
    borderRadius: LAYOUT.LARGE_MENU_ICON_SIZE / 2,
  },
  
  iconInactive: {
    opacity: 0.5,
  },
  
  iconPressed: {
    transform: [{ scale: 0.95 }],
  },
  
  label: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  
  largeLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  
  shimmerOverlay: {
    position: 'absolute',
    top: -5,
    right: -5,
    zIndex: 10,
  },
  
  starEmoji: {
    fontSize: 20,
    color: '#FFD700',
  },
});

export const animatedElementStyles = StyleSheet.create({
  balloon: {
    opacity: VISUAL_EFFECTS.BALLOON_OPACITY,
  },
  
  rocket: {
    opacity: VISUAL_EFFECTS.ROCKET_OPACITY,
  },
  
  bear: {
    opacity: VISUAL_EFFECTS.BEAR_OPACITY,
  },
});
