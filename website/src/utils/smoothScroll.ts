/**
 * Smooth scroll utility for navigation
 * Reusable across all components
 */

export const smoothScrollTo = (sectionId: string, offset: number = 80) => {
  const element = document.getElementById(sectionId);
  if (element) {
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth',
    });
  }
};

export const handleSmoothScroll = (
  e: React.MouseEvent<HTMLAnchorElement>,
  sectionId: string,
  offset: number = 80
) => {
  e.preventDefault();
  smoothScrollTo(sectionId, offset);
};

/**
 * Navigation item type for reusable nav menus
 */
export interface NavItem {
  label: string;
  href: string;
  sectionId: string | null;
}

/**
 * Default navigation items
 */
export const defaultNavItems: NavItem[] = [
  { label: 'Home', href: '/', sectionId: 'hero' },
  { label: 'Features', href: '/#features', sectionId: 'features' },
  { label: 'About', href: '/#about', sectionId: 'about' },
  { label: 'Research', href: '/#research', sectionId: 'research' },
  { label: 'Pricing', href: '/#pricing', sectionId: 'pricing' },
];

