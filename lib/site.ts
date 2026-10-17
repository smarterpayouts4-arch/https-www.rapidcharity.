export const site = {
  name: "RAPID Charity",
  fullName: "Reconciliation And Peace Innovative Development",
  url: "https://www.rapidcharity.org",
  email: "info@rapidcharity.org",
  facebook: "https://www.facebook.com/profile.php?id=61568719323011",
  /** Official page also exists: https://www.facebook.com/p/RAPID-Charity-61554674605847/ (contact fields on that page conflict with rapidcharity.org — keep profile that cites official email/domain). */
  instagram: "https://www.instagram.com/rapid.charity",
  paypal: "https://www.paypal.com/donate?hosted_button_id=EDMX8GB44KF4N",
  brand: {
    primary: "#B20F3A",
    primaryAlt: "#C81343",
    text: "#393F44",
    muted: "#918D8D",
  },
  forms: {
    johnIvy: "/apply?scholarship=john-ivy-azariah",
    robertMathais: "/apply?scholarship=robert-mathias",
    ivyAzariahWomen: "/apply?scholarship=ivy-azariah",
  },
} as const;

export type NavChild = { label: string; href: string };
export type NavItem = { label: string; href?: string; children?: NavChild[] };

export const primaryNav: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about-us" },
  { label: "Reports", href: "/reports" },
  {
    label: "Scholarship Programs",
    children: [
      { label: "John-Ivy Azariah Scholarship", href: "/general-8" },
      { label: "Robert Mathais Scholarship", href: "/robert-mathais-scholarship" },
      { label: "Ivy Azariah Scholarship", href: "/ivy-azariah-scholarship" },
    ],
  },
  { label: "Apply", href: "/apply" },
  { label: "Events", href: "/events" },
  { label: "News", href: "/blog" },
  { label: "Donate", href: "/donate" },
];
