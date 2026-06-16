import React, { useEffect, useMemo, useRef, useState } from "https://esm.sh/react@19.2.6";
import { createRoot } from "https://esm.sh/react-dom@19.2.6/client";
import * as L from "https://esm.sh/leaflet@1.9.4";
import {
  ArrowRight,
  BadgeDollarSign,
  Building2,
  Check,
  Clock3,
  FileText,
  Filter,
  Home,
  Landmark,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "https://esm.sh/lucide-react@0.482.0?deps=react@19.2.6";

const h = React.createElement;

const properties = [
  {
    id: "VTX-1024",
    title: "Baltimore Rowhome Tax Lien Certificate",
    address: "1428 Edmondson Ave, Baltimore, MD",
    county: "Baltimore City",
    state: "MD",
    assetType: "Tax Lien Certificate",
    propertyType: "Rowhome",
    status: "Available",
    lienAmount: 18650,
    askingPrice: 24750,
    assessedValue: 168000,
    redemptionWindow: "6 months",
    interestRate: "6%",
    coordinates: [39.2946, -76.6406],
    image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80",
    highlights: ["Baltimore City tax sale", "Residential block", "Assignment packet pending"],
    risk: "Medium",
  },
  {
    id: "VTX-1031",
    title: "Prince George's County Certificate",
    address: "8801 Central Ave, Capitol Heights, MD",
    county: "Prince George's County",
    state: "MD",
    assetType: "Tax Sale Certificate",
    propertyType: "Single Family",
    status: "Reviewing Offers",
    lienAmount: 9200,
    askingPrice: 13800,
    assessedValue: 241000,
    redemptionWindow: "4 months",
    interestRate: "6%",
    coordinates: [38.8889, -76.8591],
    image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
    highlights: ["Suburban collateral", "Lower lien-to-value", "County records identified"],
    risk: "Lower",
  },
  {
    id: "VTX-1042",
    title: "Montgomery County Assignment",
    address: "11700 Old Georgetown Rd, North Bethesda, MD",
    county: "Montgomery County",
    state: "MD",
    assetType: "Lien Portfolio",
    propertyType: "Condo",
    status: "Available",
    lienAmount: 31500,
    askingPrice: 42000,
    assessedValue: 386000,
    redemptionWindow: "7 months",
    interestRate: "6%",
    coordinates: [39.0486, -77.1198],
    image: "https://images.unsplash.com/photo-1605146769289-440113cc3d00?auto=format&fit=crop&w=1200&q=80",
    highlights: ["High-value county", "Condo review needed", "Title notes available"],
    risk: "Medium",
  },
  {
    id: "VTX-1057",
    title: "Frederick County Tax Sale Position",
    address: "7420 Hayward Rd, Frederick, MD",
    county: "Frederick County",
    state: "MD",
    assetType: "Tax Lien Assignment",
    propertyType: "Commercial",
    status: "Available",
    lienAmount: 22840,
    askingPrice: 32900,
    assessedValue: 315000,
    redemptionWindow: "5 months",
    interestRate: "6%",
    coordinates: [39.4282, -77.4047],
    image: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80",
    highlights: ["Commercial diligence needed", "Growth corridor", "Exterior review complete"],
    risk: "Higher",
  },
  {
    id: "VTX-1063",
    title: "Anne Arundel Certificate Opportunity",
    address: "6720 Ritchie Hwy, Glen Burnie, MD",
    county: "Anne Arundel County",
    state: "MD",
    assetType: "Tax Sale Certificate",
    propertyType: "Single Family",
    status: "Reserved",
    lienAmount: 14500,
    askingPrice: 19900,
    assessedValue: 272000,
    redemptionWindow: "8 months",
    interestRate: "6%",
    coordinates: [39.1905, -76.6122],
    image: "https://images.unsplash.com/photo-1576941089067-2de3c901e126?auto=format&fit=crop&w=1200&q=80",
    highlights: ["Suburban location", "Low lien-to-value", "Assignment packet ready"],
    risk: "Lower",
  },
  {
    id: "VTX-1078",
    title: "Eastern Shore Tax Position",
    address: "1100 N Salisbury Blvd, Salisbury, MD",
    county: "Wicomico County",
    state: "MD",
    assetType: "Tax Lien Certificate",
    propertyType: "Land",
    status: "Available",
    lienAmount: 48600,
    askingPrice: 67500,
    assessedValue: 188000,
    redemptionWindow: "6 months",
    interestRate: "6%",
    coordinates: [38.3839, -75.5904],
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
    highlights: ["Eastern Shore market", "Land diligence needed", "County record packet started"],
    risk: "Medium",
  },
];

const filters = {
  state: ["All States", "MD"],
  assetType: ["All Assets", "Tax Lien Certificate", "Tax Sale Certificate", "Tax Lien Assignment", "Lien Portfolio"],
  propertyType: ["All Types", "Single Family", "Condo", "Rowhome", "Commercial", "Land"],
};

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function Icon({ icon, size = 18 }) {
  return h(icon, { size, strokeWidth: 2.2, "aria-hidden": "true" });
}

function Logo() {
  return h(
    "a",
    { className: "logo", href: "#top", "aria-label": "Vector Tax Sale Marketplace home" },
    h("span", { className: "logo-v" }, "V"),
    h("span", { className: "logo-text" }, "ector")
  );
}

function Header() {
  return h(
    "header",
    { className: "site-header" },
    h(Logo),
    h(
      "nav",
      { className: "nav-links", "aria-label": "Main navigation" },
      h("a", { href: "#inventory" }, "Inventory"),
      h("a", { href: "#process" }, "Process"),
      h("a", { href: "#contact" }, "Contact")
    ),
    h(
      "a",
      { className: "header-cta", href: "#contact" },
      "Request Packet",
      h(Icon, { icon: ArrowRight, size: 16 })
    )
  );
}

function Hero() {
  return h(
    "section",
    { id: "top", className: "hero" },
    h("div", { className: "hero-image", "aria-hidden": "true" }),
    h(
      "div",
      { className: "hero-content" },
      h("p", { className: "eyebrow" }, "Tax Sale Asset Marketplace"),
      h("h1", null, "Vector Tax Lien Opportunities"),
      h(
        "p",
        { className: "hero-copy" },
        "Browse tax lien certificates, assignments, and property-backed tax sale positions prepared for investor review."
      ),
      h(
        "div",
        { className: "hero-actions" },
        h("a", { className: "button button-primary", href: "#inventory" }, "View Inventory", h(Icon, { icon: Home })),
        h("a", { className: "button button-secondary", href: "#contact" }, "Talk to Vector", h(Icon, { icon: FileText }))
      ),
      h(
        "div",
        { className: "hero-stats", "aria-label": "Marketplace highlights" },
        h("div", null, h("strong", null, "6"), h("span", null, "Current assets")),
        h("div", null, h("strong", null, "$145K"), h("span", null, "Lien principal")),
        h("div", null, h("strong", null, "Maryland"), h("span", null, "Initial market"))
      )
    )
  );
}

function FilterBar({ criteria, setCriteria, query, setQuery }) {
  function update(name, value) {
    setCriteria((current) => ({ ...current, [name]: value }));
  }

  return h(
    "div",
    { className: "filter-bar" },
    h(
      "label",
      { className: "search-box" },
      h(Icon, { icon: Search }),
      h("input", {
        type: "search",
        value: query,
        placeholder: "Search by city, county, asset ID, or property type",
        onChange: (event) => setQuery(event.target.value),
      })
    ),
    Object.entries(filters).map(([name, options]) =>
      h(
        "label",
        { className: "select-wrap", key: name },
        h("span", null, name === "assetType" ? "Asset" : name === "propertyType" ? "Type" : "State"),
        h(
          "select",
          { value: criteria[name], onChange: (event) => update(name, event.target.value) },
          options.map((option) => h("option", { key: option }, option))
        )
      )
    ),
    h(
      "button",
      {
        className: "icon-button",
        type: "button",
        title: "Reset filters",
        onClick: () => {
          setQuery("");
          setCriteria({ state: "All States", assetType: "All Assets", propertyType: "All Types" });
        },
      },
      h(Icon, { icon: SlidersHorizontal })
    )
  );
}

function PropertyCard({ item, onSelect }) {
  return h(
    "button",
    { className: "property-card", type: "button", onClick: () => onSelect(item) },
    h("div", { className: "property-photo", style: { backgroundImage: `url("${item.image}")` } }, h("span", null, item.status)),
    h(
      "div",
      { className: "property-body" },
      h("div", { className: "card-kicker" }, h("span", null, item.id), h("span", null, item.assetType)),
      h("h3", null, item.title),
      h("p", { className: "address" }, h(Icon, { icon: MapPin, size: 16 }), item.address),
      h(
        "dl",
        { className: "property-metrics" },
        h("div", null, h("dt", null, "Ask"), h("dd", null, money(item.askingPrice))),
        h("div", null, h("dt", null, "Lien"), h("dd", null, money(item.lienAmount))),
        h("div", null, h("dt", null, "Value"), h("dd", null, money(item.assessedValue))),
        h("div", null, h("dt", null, "Redeem"), h("dd", null, item.redemptionWindow))
      ),
      h(
        "div",
        { className: "card-footer" },
        h("span", { className: `risk risk-${item.risk.toLowerCase()}` }, `${item.risk} diligence`),
        h("span", { className: "text-button" }, "Details", h(Icon, { icon: ArrowRight, size: 16 }))
      )
    )
  );
}

function PropertyMap({ items, selectedId, onSelect }) {
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const nodeRef = useRef(null);

  useEffect(() => {
    if (!nodeRef.current || mapRef.current) return;

    mapRef.current = L.map(nodeRef.current, {
      center: [39.0458, -76.6413],
      zoom: 8,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(mapRef.current);

    layerRef.current = L.layerGroup().addTo(mapRef.current);

    return () => {
      mapRef.current.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !layerRef.current) return;

    layerRef.current.clearLayers();
    const bounds = [];

    items.forEach((item) => {
      if (!item.coordinates) return;
      bounds.push(item.coordinates);
      const isSelected = selectedId === item.id;
      const marker = L.marker(item.coordinates, {
        title: item.title,
        riseOnHover: true,
        opacity: isSelected ? 1 : 0.88,
      });

      marker
        .bindPopup(`<strong>${item.id}</strong><br>${item.title}<br>${money(item.askingPrice)}`)
        .on("click", () => onSelect(item))
        .addTo(layerRef.current);

      if (isSelected) {
        marker.openPopup();
      }
    });

    if (bounds.length === 1) {
      mapRef.current.setView(bounds[0], 12);
    } else if (bounds.length > 1) {
      mapRef.current.fitBounds(bounds, { padding: [32, 32], maxZoom: 10 });
    } else {
      mapRef.current.setView([39.0458, -76.6413], 8);
    }
  }, [items, onSelect, selectedId]);

  return h(
    "aside",
    { className: "map-panel", "aria-label": "Maryland property map" },
    h(
      "div",
      { className: "map-heading" },
      h("div", null, h("p", { className: "eyebrow" }, "Map View"), h("h3", null, "Maryland inventory")),
      h("span", null, `${items.length} assets`)
    ),
    h("div", { className: "property-map", ref: nodeRef }),
    h("p", { className: "map-note" }, "Map locations are approximate for preview. Confirm parcel-level location before publishing.")
  );
}

function Inventory() {
  const [query, setQuery] = useState("");
  const [criteria, setCriteria] = useState({ state: "All States", assetType: "All Assets", propertyType: "All Types" });
  const [selected, setSelected] = useState(null);
  const [mapSelectedId, setMapSelectedId] = useState(null);

  const visibleProperties = useMemo(() => {
    const term = query.trim().toLowerCase();
    return properties.filter((item) => {
      const matchesSearch =
        !term ||
        [item.id, item.title, item.address, item.county, item.state, item.assetType, item.propertyType]
          .join(" ")
          .toLowerCase()
          .includes(term);
      const matchesState = criteria.state === "All States" || item.state === criteria.state;
      const matchesAsset = criteria.assetType === "All Assets" || item.assetType === criteria.assetType;
      const matchesType = criteria.propertyType === "All Types" || item.propertyType === criteria.propertyType;
      return matchesSearch && matchesState && matchesAsset && matchesType;
    });
  }, [criteria, query]);

  return h(
    "section",
    { id: "inventory", className: "section inventory-section" },
    h(
      "div",
      { className: "section-heading split-heading" },
      h("div", null, h("p", { className: "eyebrow" }, "Live Inventory"), h("h2", null, "Tax sale positions ready for investor review")),
      h("p", null, "Each listing is a starting point for due diligence, assignment review, title questions, and transaction terms. Final documents should be confirmed before purchase.")
    ),
    h(FilterBar, { criteria, setCriteria, query, setQuery }),
    h(
      "div",
      { className: "result-row" },
      h("span", null, `${visibleProperties.length} matching assets`),
      h("span", null, "Maryland sample data for preview")
    ),
    h(
      "div",
      { className: "inventory-layout" },
      h(
        "div",
        { className: "property-grid" },
        visibleProperties.map((item) =>
          h(PropertyCard, {
            key: item.id,
            item,
            onSelect: (property) => {
              setMapSelectedId(property.id);
              setSelected(property);
            },
          })
        )
      ),
      h(PropertyMap, {
        items: visibleProperties,
        selectedId: mapSelectedId,
        onSelect: (property) => {
          setMapSelectedId(property.id);
          setSelected(property);
        },
      })
    ),
    selected && h(AssetModal, { item: selected, onClose: () => setSelected(null) })
  );
}

function AssetModal({ item, onClose }) {
  return h(
    "div",
    { className: "modal-backdrop", role: "presentation", onClick: onClose },
    h(
      "article",
      { className: "modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "asset-title", onClick: (event) => event.stopPropagation() },
      h(
        "button",
        { className: "modal-close", type: "button", title: "Close", onClick: onClose },
        h(Icon, { icon: X })
      ),
      h("div", { className: "modal-photo", style: { backgroundImage: `url("${item.image}")` } }),
      h(
        "div",
        { className: "modal-content" },
        h("p", { className: "eyebrow" }, item.id),
        h("h3", { id: "asset-title" }, item.title),
        h("p", { className: "address" }, h(Icon, { icon: MapPin, size: 16 }), item.address),
        h(
          "div",
          { className: "modal-metrics" },
          h("div", null, h("span", null, "Asking Price"), h("strong", null, money(item.askingPrice))),
          h("div", null, h("span", null, "Lien Amount"), h("strong", null, money(item.lienAmount))),
          h("div", null, h("span", null, "Assessed Value"), h("strong", null, money(item.assessedValue))),
          h("div", null, h("span", null, "Rate"), h("strong", null, item.interestRate))
        ),
        h(
          "ul",
          { className: "check-list" },
          item.highlights.map((point) => h("li", { key: point }, h(Icon, { icon: Check, size: 16 }), point))
        ),
        h(
          "a",
          { className: "button button-primary full-button", href: "#contact", onClick: onClose },
          "Request Due Diligence Packet",
          h(Icon, { icon: FileText })
        )
      )
    )
  );
}

function Process() {
  const steps = [
    { icon: Filter, title: "Screen the inventory", text: "Review asset type, lien amount, location, redemption window, and collateral profile." },
    { icon: ShieldCheck, title: "Request the packet", text: "Vector shares tax records, assignment notes, title questions, and available diligence material." },
    { icon: BadgeDollarSign, title: "Negotiate terms", text: "Buy the certificate, fund a position, or discuss a portfolio sale with clear closing steps." },
  ];

  return h(
    "section",
    { id: "process", className: "section process-section" },
    h(
      "div",
      { className: "process-intro" },
      h("p", { className: "eyebrow" }, "How It Works"),
      h("h2", null, "A cleaner way to review tax sale inventory"),
      h("p", null, "The goal is not to make a legal promise online. The goal is to make the opportunity visible, organized, and easy for qualified buyers to evaluate.")
    ),
    h(
      "div",
      { className: "process-grid" },
      steps.map((step, index) =>
        h(
          "article",
          { className: "process-card", key: step.title },
          h("span", { className: "step-number" }, `0${index + 1}`),
          h("div", { className: "process-icon" }, h(Icon, { icon: step.icon, size: 24 })),
          h("h3", null, step.title),
          h("p", null, step.text)
        )
      )
    )
  );
}

function TrustBand() {
  return h(
    "section",
    { className: "trust-band", "aria-label": "Investor review points" },
    h("div", null, h(Icon, { icon: Landmark, size: 22 }), h("span", null, "County records first")),
    h("div", null, h(Icon, { icon: Clock3, size: 22 }), h("span", null, "Redemption timeline tracked")),
    h("div", null, h(Icon, { icon: Building2, size: 22 }), h("span", null, "Property-backed positions")),
    h("div", null, h(Icon, { icon: FileText, size: 22 }), h("span", null, "Document packet on request"))
  );
}

function Contact() {
  const [submitted, setSubmitted] = useState(false);

  return h(
    "section",
    { id: "contact", className: "section contact-section" },
    h(
      "div",
      { className: "contact-copy" },
      h("p", { className: "eyebrow" }, "Investor Access"),
      h("h2", null, "Request asset details or submit an offer"),
      h("p", null, "Send the asset ID, target budget, and whether you want to buy certificates, assignments, or a portfolio package.")
    ),
    h(
      "form",
      {
        className: "contact-form",
        onSubmit: (event) => {
          event.preventDefault();
          setSubmitted(true);
        },
      },
      h("label", null, "Name", h("input", { name: "name", placeholder: "Your name", required: true })),
      h("label", null, "Email / Phone", h("input", { name: "contact", placeholder: "Best contact", required: true })),
      h(
        "label",
        null,
        "Interest",
        h(
          "select",
          { name: "interest", defaultValue: "Request due diligence packet" },
          h("option", null, "Request due diligence packet"),
          h("option", null, "Submit an offer"),
          h("option", null, "Buy a portfolio"),
          h("option", null, "Ask a legal/title question")
        )
      ),
      h("label", null, "Message", h("textarea", { name: "message", rows: 5, placeholder: "Asset ID, budget, preferred state, timeline, or questions" })),
      h("button", { className: "button button-primary", type: "submit" }, "Send Request", h(Icon, { icon: ArrowRight })),
      submitted && h("p", { className: "form-status", role: "status" }, "Received. This prototype can later connect to email, CRM, or Azure Functions.")
    )
  );
}

function Footer() {
  return h(
    "footer",
    { className: "site-footer" },
    h(Logo),
    h("p", null, "Tax sale assets involve legal and title risk. This site is for investor review and does not replace legal, tax, or title advice.")
  );
}

function App() {
  return h(React.Fragment, null, h(Header), h("main", null, h(Hero), h(TrustBand), h(Inventory), h(Process), h(Contact)), h(Footer));
}

createRoot(document.getElementById("root")).render(h(App));
