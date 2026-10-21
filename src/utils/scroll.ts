import React from "react";

export const scrollToSection = (id: string, e?: React.MouseEvent) => {
  if (e) {
    e.preventDefault();
  }
  const element = document.getElementById(id);
  if (element) {
    const navbarHeight = 80;
    const elementPosition = element.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top: elementPosition - navbarHeight,
      behavior: 'smooth'
    });
  }
};
