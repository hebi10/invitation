export function scrollToSection(sectionId: string) {
  if (typeof window === 'undefined') {
    return;
  }

  const target = document.getElementById(sectionId);
  if (!target) {
    return;
  }

  target.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}
