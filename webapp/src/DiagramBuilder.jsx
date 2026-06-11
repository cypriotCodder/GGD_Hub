import { useState, useRef, useCallback, useEffect } from "react";

// ─── Component library ────────────────────────────────────────────────────────
const COMPONENTS = [
  { type: "internet",   label: "Internet / ISP",     icon: "🌐", color: "#6B7280", desc: "The public internet or ISP connection. Always at the top of the diagram." },
  { type: "firewall",   label: "Firewall",            icon: "🔥", color: "#DC2626", desc: "Filters inbound/outbound traffic. Place between untrusted and trusted zones." },
  { type: "router",     label: "Router",              icon: "⬡",  color: "#7C3AED", desc: "Routes traffic between networks. Connects ISP to internal network." },
  { type: "switch",     label: "Switch / L3 Switch",  icon: "⧉",  color: "#1D4ED8", desc: "Connects devices within a network segment. L3 switch can route between VLANs." },
  { type: "server",     label: "Server",              icon: "🖥",  color: "#059669", desc: "Hosts services. In DMZ: web/mail/DNS servers. Internal: AD, file servers." },
  { type: "workstation",label: "Workstation",         icon: "💻", color: "#0891B2", desc: "End-user devices. Place in internal VLAN, isolated from DMZ." },
  { type: "dmz",        label: "DMZ Zone",            icon: "🟡", color: "#D97706", desc: "Demilitarized Zone — hosts public-facing services, isolated from internal network." },
  { type: "vlan",       label: "VLAN / Subnet",       icon: "▣",  color: "#0284C7", desc: "Logical network segment. Isolates traffic. Label with IP range (e.g. 192.168.10.0/24)." },
  { type: "vpn",        label: "VPN Gateway",         icon: "🔒", color: "#7C3AED", desc: "Secure tunnel endpoint. Remote employees connect through VPN before reaching internal network." },
  { type: "ids",        label: "IDS / IPS",           icon: "👁",  color: "#B45309", desc: "IDS detects threats (passive). IPS blocks threats (active, inline). Place near firewall." },
  { type: "cloud",      label: "Cloud Provider",      icon: "☁",  color: "#6366F1", desc: "AWS, Azure, GCP. Use for IaaS/PaaS/SaaS services connected to on-premise infra." },
  { type: "wifi",       label: "WiFi Access Point",   icon: "📡", color: "#0891B2", desc: "Wireless access. Separate SSIDs for internal, guest, and IoT. Use WPA3." },
  { type: "attacker",   label: "Attacker",            icon: "💀", color: "#991B1B", desc: "Represents a threat actor. Use in attack diagrams to show attack path." },
  { type: "user",       label: "Remote User",         icon: "👤", color: "#374151", desc: "External/remote user. Must connect via VPN to reach internal resources." },
];

const SCENARIOS = [
  {
    name: "Simple DMZ",
    desc: "Basic three-zone architecture: Internet → Firewall → DMZ + Internal",
    nodes: [
      { id: 1, type: "internet",    label: "Internet",       x: 320, y: 30  },
      { id: 2, type: "firewall",    label: "Edge Firewall",  x: 320, y: 130 },
      { id: 3, type: "dmz",         label: "DMZ\n192.168.60.0/24", x: 160, y: 250 },
      { id: 4, type: "server",      label: "Web Server",     x: 80,  y: 370 },
      { id: 5, type: "server",      label: "Mail Server",    x: 230, y: 370 },
      { id: 6, type: "firewall",    label: "Internal FW",    x: 460, y: 250 },
      { id: 7, type: "switch",      label: "Core Switch",    x: 460, y: 370 },
      { id: 8, type: "workstation", label: "Employees\n10.0.10.0/24", x: 380, y: 490 },
      { id: 9, type: "server",      label: "AD Server\n10.0.50.0/24", x: 530, y: 490 },
    ],
    edges: [[1,2],[2,3],[3,4],[3,5],[2,6],[6,7],[7,8],[7,9]],
  },
  {
    name: "ARP Poisoning → MitM",
    desc: "Shows how ARP poisoning routes victim traffic through the attacker",
    nodes: [
      { id: 1, type: "router",      label: "Gateway\n192.168.1.1",   x: 320, y: 50  },
      { id: 2, type: "workstation", label: "Victim\n192.168.1.10",   x: 140, y: 250 },
      { id: 3, type: "attacker",    label: "Attacker\n192.168.1.99", x: 320, y: 250 },
      { id: 4, type: "server",      label: "Web Server\n(HTTPS)",    x: 500, y: 250 },
      { id: 5, type: "workstation", label: "Legitimate User",        x: 140, y: 420 },
    ],
    edges: [[1,3],[3,2],[3,4],[2,5]],
    edgeLabels: { "1-3": "Poisoned ARP", "3-2": "Intercepts traffic", "3-4": "Relays to server", "2-5": "Normal traffic" },
  },
  {
    name: "Enterprise with VPN",
    desc: "Full enterprise setup: dual ISP, DMZ, segmented VLANs, VPN for remote workers",
    nodes: [
      { id: 1,  type: "internet",    label: "ISP 1",             x: 200, y: 30  },
      { id: 2,  type: "internet",    label: "ISP 2",             x: 440, y: 30  },
      { id: 3,  type: "router",      label: "Edge Router",       x: 320, y: 120 },
      { id: 4,  type: "firewall",    label: "Perimeter FW",      x: 320, y: 210 },
      { id: 5,  type: "ids",         label: "IDS/IPS",           x: 160, y: 210 },
      { id: 6,  type: "dmz",         label: "DMZ\n192.168.60.0/24", x: 100, y: 320 },
      { id: 7,  type: "server",      label: "Web Server",        x: 40,  y: 430 },
      { id: 8,  type: "server",      label: "DNS/Mail",          x: 160, y: 430 },
      { id: 9,  type: "firewall",    label: "Internal FW",       x: 320, y: 320 },
      { id: 10, type: "switch",      label: "Core Switch",       x: 320, y: 420 },
      { id: 11, type: "vlan",        label: "Finance VLAN\n192.168.10.0/24", x: 200, y: 530 },
      { id: 12, type: "vlan",        label: "HR VLAN\n192.168.20.0/24",      x: 320, y: 530 },
      { id: 13, type: "vlan",        label: "IT VLAN\n192.168.30.0/24",      x: 440, y: 530 },
      { id: 14, type: "vpn",         label: "VPN Gateway",       x: 520, y: 210 },
      { id: 15, type: "user",        label: "Remote Worker",     x: 620, y: 100 },
    ],
    edges: [[1,3],[2,3],[3,4],[4,5],[4,6],[6,7],[6,8],[4,9],[9,10],[10,11],[10,12],[10,13],[4,14],[15,14]],
  },
  {
    name: "Cloud (AWS) Architecture",
    desc: "AWS VPC with public and private subnets, load balancer, NAT gateway",
    nodes: [
      { id: 1,  type: "internet",    label: "Internet",           x: 320, y: 30  },
      { id: 2,  type: "firewall",    label: "WAF\n(Web App FW)",  x: 320, y: 120 },
      { id: 3,  type: "router",      label: "Internet Gateway",   x: 320, y: 210 },
      { id: 4,  type: "switch",      label: "ALB\n(Load Balancer)", x: 320, y: 300 },
      { id: 5,  type: "vlan",        label: "Public Subnet\n10.0.1.0/24", x: 160, y: 390 },
      { id: 6,  type: "server",      label: "EC2 Web\nServer",    x: 100, y: 490 },
      { id: 7,  type: "server",      label: "NAT Gateway",        x: 230, y: 490 },
      { id: 8,  type: "vlan",        label: "Private Subnet\n10.0.2.0/24", x: 480, y: 390 },
      { id: 9,  type: "server",      label: "EC2 App\nServer",    x: 420, y: 490 },
      { id: 10, type: "server",      label: "RDS Database",       x: 540, y: 490 },
      { id: 11, type: "cloud",       label: "S3 Bucket\n(Storage)", x: 320, y: 560 },
    ],
    edges: [[1,2],[2,3],[3,4],[4,5],[5,6],[5,7],[4,8],[8,9],[8,10],[9,11],[10,11]],
  },
  {
    name: "HQ Secure E-Commerce",
    desc: "E-commerce HQ: Dual ISP, DMZ (Web/API/Mail), Internal Services, Guest WiFi, and 4 Dept VLANs",
    nodes: [
      { id: 1,  type: "internet",    label: "ISP 1",             x: 250, y: 30  },
      { id: 2,  type: "internet",    label: "ISP 2",             x: 450, y: 30  },
      { id: 3,  type: "router",      label: "Edge Router\nFailover", x: 350, y: 100 },
      { id: 4,  type: "firewall",    label: "Perimeter FW",      x: 350, y: 180 },
      { id: 5,  type: "ids",         label: "IDS/IPS",           x: 250, y: 180 },
      { id: 6,  type: "dmz",         label: "DMZ\n10.10.60.0/24", x: 150, y: 280 },
      { id: 7,  type: "server",      label: "Web Server",        x: 50,  y: 380 },
      { id: 8,  type: "server",      label: "API Gateway",       x: 150, y: 380 },
      { id: 9,  type: "server",      label: "Mail Server",       x: 250, y: 380 },
      { id: 10, type: "firewall",    label: "Internal FW",       x: 350, y: 280 },
      { id: 11, type: "switch",      label: "Core Switch",       x: 350, y: 380 },
      { id: 12, type: "vlan",        label: "Sales\n10.10.10.0/24", x: 50,  y: 480 },
      { id: 13, type: "vlan",        label: "Eng\n10.10.20.0/24",   x: 150, y: 480 },
      { id: 14, type: "vlan",        label: "Mktg\n10.10.30.0/24",  x: 250, y: 480 },
      { id: 15, type: "vlan",        label: "IT\n10.10.40.0/24",    x: 350, y: 480 },
      { id: 16, type: "server",      label: "Internal Svcs\n10.10.50.0/24", x: 500, y: 480 },
      { id: 17, type: "vpn",         label: "VPN Gateway\n10.10.70.0/24", x: 550, y: 180 },
      { id: 18, type: "user",        label: "Remote Worker",     x: 650, y: 100 },
      { id: 19, type: "wifi",        label: "Guest WiFi\n10.10.80.0/24", x: 550, y: 280 },
    ],
    edges: [[1,3],[2,3],[3,4],[4,5],[4,6],[6,7],[6,8],[6,9],[4,10],[10,11],[11,12],[11,13],[11,14],[11,15],[11,16],[4,17],[18,17],[4,19]],
  },
];

// ─── Exam tips per component type ────────────────────────────────────────────
const EXAM_TIPS = {
  internet:    "Always draw the internet/ISP at the very top. The firewall must sit immediately below it.",
  firewall:    "In a DMZ design, you need TWO firewalls: one between internet and DMZ, one between DMZ and internal. This is the key mark-earner.",
  router:      "Routers operate at Layer 3 (Network). They connect different networks and select paths.",
  switch:      "Switches operate at Layer 2 (Data Link). A Layer 3 switch can route between VLANs without a dedicated router.",
  server:      "Servers in the DMZ face the internet (web, mail, DNS). Servers internal to the network (AD, file server, DB) go inside the internal firewall.",
  workstation: "Workstations go in the internal VLAN, never in the DMZ. Label with IP range.",
  dmz:         "The DMZ hosts services that need public internet access but must be isolated from the internal network. Think of it as a 'semi-trusted' zone.",
  vlan:        "Always label VLANs with IP ranges (e.g. 192.168.10.0/24). The exam may provide specific IP ranges — use them.",
  vpn:         "VPN Gateway allows remote employees to securely access the internal network. It typically sits at the perimeter, connecting into the internal network — not the DMZ.",
  ids:         "IDS = passive (detects, alerts). IPS = active (blocks inline). Place IDS/IPS between the edge firewall and the DMZ/internal network for maximum coverage.",
  cloud:       "In cloud diagrams, remember the Shared Responsibility Model: you manage data and apps, the provider manages the infrastructure.",
  wifi:        "Separate WiFi into three SSIDs: internal (WPA3-Enterprise + 802.1X), guest (isolated VLAN), IoT (separate VLAN, no internal access).",
  attacker:    "In attack diagrams, show the attacker's entry point and movement path. Useful for ARP poisoning, MitM, and Evil Twin diagrams.",
  user:        "Remote users must always go through a VPN gateway before reaching internal resources. Never connect directly to internal network.",
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function DiagramBuilder() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [edgeLabels, setEdgeLabels] = useState({});
  const [selected, setSelected] = useState(null);
  const [connecting, setConnecting] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [tip, setTip] = useState(null);
  const [activeScenario, setActiveScenario] = useState(null);
  const [labelEdit, setLabelEdit] = useState(null);
  const [labelValue, setLabelValue] = useState("");
  const [panel, setPanel] = useState("components"); // components | scenarios | tips
  const canvasRef = useRef(null);
  const nextId = useRef(100);

  const addNode = (type) => {
    const comp = COMPONENTS.find(c => c.type === type);
    const id = nextId.current++;
    setNodes(n => [...n, { id, type, label: comp.label, x: 180 + Math.random() * 200, y: 100 + Math.random() * 200 }]);
    setTip({ type, text: EXAM_TIPS[type] });
  };

  const loadScenario = (s) => {
    setNodes(s.nodes.map(n => ({ ...n })));
    setEdges(s.edges.map(([a, b]) => [a, b]));
    setEdgeLabels(s.edgeLabels || {});
    setSelected(null);
    setConnecting(null);
    setActiveScenario(s.name);
    setTip(null);
  };

  const clearCanvas = () => { setNodes([]); setEdges([]); setEdgeLabels({}); setSelected(null); setConnecting(null); setActiveScenario(null); setTip(null); };

  const deleteSelected = () => {
    if (selected === null) return;
    setNodes(n => n.filter(node => node.id !== selected));
    setEdges(e => e.filter(([a, b]) => a !== selected && b !== selected));
    setSelected(null);
  };

  const onNodeMouseDown = (e, id) => {
    e.stopPropagation();
    if (connecting !== null) {
      if (connecting !== id) {
        const key = `${Math.min(connecting, id)}-${Math.max(connecting, id)}`;
        setEdges(ev => ev.some(([a,b]) => (a===connecting&&b===id)||(a===id&&b===connecting)) ? ev : [...ev, [connecting, id]]);
      }
      setConnecting(null);
      return;
    }
    setSelected(id);
    const node = nodes.find(n => n.id === id);
    const rect = canvasRef.current.getBoundingClientRect();
    setDragging(id);
    setDragOffset({ x: e.clientX - rect.left - node.x, y: e.clientY - rect.top - node.y });
  };

  const onMouseMove = useCallback((e) => {
    if (dragging === null) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(20, Math.min(rect.width - 60, e.clientX - rect.left - dragOffset.x));
    const y = Math.max(20, Math.min(rect.height - 60, e.clientY - rect.top - dragOffset.y));
    setNodes(n => n.map(node => node.id === dragging ? { ...node, x, y } : node));
  }, [dragging, dragOffset]);

  const onMouseUp = useCallback(() => { setDragging(null); }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
  }, [onMouseMove, onMouseUp]);

  const startLabel = (id) => {
    const node = nodes.find(n => n.id === id);
    setLabelEdit(id);
    setLabelValue(node.label);
  };

  const saveLabel = () => {
    setNodes(n => n.map(node => node.id === labelEdit ? { ...node, label: labelValue } : node));
    setLabelEdit(null);
  };

  const selectedNode = nodes.find(n => n.id === selected);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", display: "flex", flexDirection: "column", height: "100vh", background: "var(--color-background-secondary)", overflow: "hidden" }}>

      {/* ── Header ── */}
      <div style={{ padding: "10px 16px", background: "var(--color-background-primary)", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div>
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)" }}>Network Diagram Builder</span>
          <span style={{ fontSize: 12, color: "var(--color-text-secondary)", marginLeft: 10 }}>COMP-432 Exam Prep</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {connecting !== null && (
            <span style={{ fontSize: 12, background: "#FEF3C7", color: "#92400E", padding: "4px 10px", borderRadius: 6 }}>
              🔗 Click another node to connect
            </span>
          )}
          {selected && (
            <>
              <button onClick={() => { setConnecting(selected); }} style={btnStyle("#E0F2FE","#0369A1")}>🔗 Connect</button>
              <button onClick={() => startLabel(selected)} style={btnStyle("#F0FDF4","#166534")}>✏️ Rename</button>
              <button onClick={deleteSelected} style={btnStyle("#FEF2F2","#991B1B")}>🗑 Delete</button>
            </>
          )}
          <button onClick={clearCanvas} style={btnStyle("var(--color-background-secondary)","var(--color-text-secondary)")}>Clear</button>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Left sidebar ── */}
        <div style={{ width: 220, background: "var(--color-background-primary)", borderRight: "0.5px solid var(--color-border-tertiary)", display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden" }}>

          {/* Tab bar */}
          <div style={{ display: "flex", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
            {[["components","🧱"],["scenarios","📐"],["tips","💡"]].map(([p, icon]) => (
              <button key={p} onClick={() => setPanel(p)} style={{
                flex: 1, padding: "8px 2px", fontSize: 11, border: "none", cursor: "pointer", textTransform: "capitalize",
                background: panel === p ? "var(--color-background-info)" : "var(--color-background-primary)",
                color: panel === p ? "var(--color-text-info)" : "var(--color-text-secondary)",
                borderBottom: panel === p ? "2px solid var(--color-border-info)" : "2px solid transparent",
                fontWeight: panel === p ? 600 : 400
              }}>{icon} {p}</button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
            {panel === "components" && (
              <>
                <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: "0 0 8px", lineHeight: 1.4 }}>Click a component to add it to the canvas</p>
                {COMPONENTS.map(c => (
                  <button key={c.type} onClick={() => addNode(c.type)}
                    onMouseEnter={() => setTip({ type: c.type, text: EXAM_TIPS[c.type] })}
                    style={{
                      width: "100%", textAlign: "left", padding: "7px 8px", marginBottom: 4,
                      background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)",
                      borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", gap: 8
                    }}>
                    <span style={{ fontSize: 16 }}>{c.icon}</span>
                    <span style={{ fontSize: 12, color: "var(--color-text-primary)", fontWeight: 500 }}>{c.label}</span>
                  </button>
                ))}
              </>
            )}

            {panel === "scenarios" && (
              <>
                <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: "0 0 8px", lineHeight: 1.4 }}>Load a pre-built exam scenario to study</p>
                {SCENARIOS.map(s => (
                  <button key={s.name} onClick={() => loadScenario(s)} style={{
                    width: "100%", textAlign: "left", padding: "8px 10px", marginBottom: 6,
                    background: activeScenario === s.name ? "var(--color-background-info)" : "var(--color-background-secondary)",
                    border: `0.5px solid ${activeScenario === s.name ? "var(--color-border-info)" : "var(--color-border-tertiary)"}`,
                    borderRadius: 6, cursor: "pointer"
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: activeScenario === s.name ? "var(--color-text-info)" : "var(--color-text-primary)", marginBottom: 2 }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", lineHeight: 1.4 }}>{s.desc}</div>
                  </button>
                ))}
              </>
            )}

            {panel === "tips" && (
              <>
                <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: "0 0 8px", lineHeight: 1.4 }}>Key rules for drawing exam-level diagrams</p>
                {[
                  ["🏗 Structure", "Always flow top-to-bottom: Internet → Firewall → DMZ → Internal Firewall → Internal Network"],
                  ["🔥 Two Firewalls", "A DMZ needs two firewalls. One firewall separating it from the internet, one separating it from the internal LAN. This is the most common exam mark-earner."],
                  ["🟡 DMZ Contents", "Only put publicly-accessible servers in the DMZ: web server, mail server, public DNS. Never put workstations or AD in the DMZ."],
                  ["▣ Label VLANs", "Always label VLANs with IP ranges. If the exam provides specific IPs (e.g. 192.168.10.0/24 for Finance), use them exactly."],
                  ["🔒 VPN Placement", "VPN gateway sits at the perimeter. Remote users connect via VPN, then their traffic enters the internal network — never directly."],
                  ["👁 IDS/IPS", "IDS is passive (detects and alerts). IPS is active inline (blocks). Place between firewall and internal network for maximum coverage."],
                  ["📡 WiFi Zones", "Always show three separate WiFi zones: internal (WPA3-Enterprise), guest (isolated), IoT (separate VLAN)."],
                  ["🔗 Label Connections", "Label critical connections to show what's traversing the link: HTTPS, VPN tunnel, VLAN trunk, etc."],
                ].map(([title, text]) => (
                  <div key={title} style={{ marginBottom: 10, padding: "8px 10px", background: "var(--color-background-secondary)", borderRadius: 6, border: "0.5px solid var(--color-border-tertiary)" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 3 }}>{title}</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>{text}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* ── Canvas ── */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <svg
            ref={canvasRef}
            width="100%" height="100%"
            style={{ cursor: connecting !== null ? "crosshair" : "default", background: "var(--color-background-secondary)" }}
            onClick={(e) => { if (e.target === e.currentTarget) { setSelected(null); if (connecting !== null) setConnecting(null); } }}
          >
            {/* Grid */}
            <defs>
              <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
                <path d="M 28 0 L 0 0 0 28" fill="none" stroke="var(--color-border-tertiary)" strokeWidth="0.3" opacity="0.5"/>
              </pattern>
              <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="var(--color-border-secondary)" />
              </marker>
              <marker id="arrowhead-red" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#DC2626" />
              </marker>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Edges */}
            {edges.map(([a, b], i) => {
              const na = nodes.find(n => n.id === a);
              const nb = nodes.find(n => n.id === b);
              if (!na || !nb) return null;
              const key = `${Math.min(a,b)}-${Math.max(a,b)}`;
              const lbl = edgeLabels[key] || edgeLabels[`${a}-${b}`];
              const isAttack = (na.type === "attacker" || nb.type === "attacker");
              const mx = (na.x + nb.x) / 2;
              const my = (na.y + nb.y) / 2;
              return (
                <g key={i}>
                  <line
                    x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                    stroke={isAttack ? "#DC2626" : "var(--color-border-secondary)"}
                    strokeWidth={isAttack ? 2 : 1.5}
                    strokeDasharray={isAttack ? "6 3" : "none"}
                    markerEnd={isAttack ? "url(#arrowhead-red)" : "url(#arrowhead)"}
                    opacity={0.8}
                  />
                  {lbl && (
                    <text x={mx} y={my - 6} textAnchor="middle" fontSize="9" fill={isAttack ? "#DC2626" : "var(--color-text-secondary)"} fontWeight="500">{lbl}</text>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map(node => {
              const comp = COMPONENTS.find(c => c.type === node.type);
              const isSelected = selected === node.id;
              const isConnecting = connecting === node.id;
              const isZone = node.type === "dmz" || node.type === "vlan";
              const lines = node.label.split("\n");
              return (
                <g key={node.id}
                  onMouseDown={e => onNodeMouseDown(e, node.id)}
                  onDoubleClick={() => startLabel(node.id)}
                  style={{ cursor: "grab" }}
                >
                  {isZone ? (
                    <rect
                      x={node.x - 55} y={node.y - 30}
                      width={110} height={60}
                      rx={8}
                      fill={comp.color + "18"}
                      stroke={isSelected ? "#2563EB" : isConnecting ? "#16A34A" : comp.color}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      strokeDasharray="6 3"
                    />
                  ) : (
                    <circle
                      cx={node.x} cy={node.y} r={28}
                      fill={"var(--color-background-primary)"}
                      stroke={isSelected ? "#2563EB" : isConnecting ? "#16A34A" : comp.color}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                    />
                  )}
                  <text x={node.x} y={node.y - 4} textAnchor="middle" fontSize="18" dominantBaseline="middle" style={{ pointerEvents: "none", userSelect: "none" }}>
                    {comp.icon}
                  </text>
                  {lines.map((line, li) => (
                    <text key={li} x={node.x} y={node.y + 36 + li * 13} textAnchor="middle" fontSize="10"
                      fill="var(--color-text-primary)" fontWeight="500"
                      style={{ pointerEvents: "none", userSelect: "none" }}>
                      {line}
                    </text>
                  ))}
                </g>
              );
            })}

            {/* Empty state */}
            {nodes.length === 0 && (
              <text x="50%" y="45%" textAnchor="middle" fontSize="13" fill="var(--color-text-secondary)">
                ← Add components from the panel, or load a scenario
              </text>
            )}
          </svg>

          {/* Tip overlay */}
          {tip && (
            <div style={{
              position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
              background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-info)",
              borderRadius: 8, padding: "8px 14px", maxWidth: 420, boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontSize: 12, color: "var(--color-text-info)", fontWeight: 600, marginBottom: 3, display: "block" }}>
                  💡 Exam tip — {COMPONENTS.find(c => c.type === tip.type)?.label}
                </span>
                <button onClick={() => setTip(null)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 12, color: "var(--color-text-secondary)", marginLeft: 8, padding: 0 }}>✕</button>
              </div>
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>{tip.text}</span>
            </div>
          )}

          {/* Label editor */}
          {labelEdit !== null && (
            <div style={{
              position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
              background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)",
              borderRadius: 10, padding: "16px 20px", boxShadow: "0 4px 20px rgba(0,0,0,0.12)", zIndex: 10, width: 280
            }}>
              <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>Edit label</p>
              <p style={{ margin: "0 0 10px", fontSize: 11, color: "var(--color-text-secondary)" }}>Use \\n for a new line (e.g. for IP ranges)</p>
              <textarea
                autoFocus
                value={labelValue}
                onChange={e => setLabelValue(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && e.metaKey) saveLabel(); if (e.key === "Escape") setLabelEdit(null); }}
                style={{ width: "100%", padding: "6px 8px", fontSize: 13, borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", boxSizing: "border-box", minHeight: 60, resize: "vertical" }}
              />
              <div style={{ display: "flex", gap: 6, marginTop: 8, justifyContent: "flex-end" }}>
                <button onClick={() => setLabelEdit(null)} style={btnStyle("var(--color-background-secondary)", "var(--color-text-secondary)")}>Cancel</button>
                <button onClick={saveLabel} style={btnStyle("var(--color-background-info)", "var(--color-text-info)")}>Save</button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right panel: selected node info ── */}
        {selectedNode && (
          <div style={{ width: 200, background: "var(--color-background-primary)", borderLeft: "0.5px solid var(--color-border-tertiary)", padding: 12, flexShrink: 0, overflowY: "auto" }}>
            <p style={{ margin: "0 0 6px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-secondary)", fontWeight: 600 }}>Selected</p>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{COMPONENTS.find(c => c.type === selectedNode.type)?.icon}</div>
            <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{selectedNode.label}</p>
            <p style={{ margin: "0 0 12px", fontSize: 11, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
              {COMPONENTS.find(c => c.type === selectedNode.type)?.desc}
            </p>
            <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 10 }}>
              <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 600, color: "var(--color-text-primary)" }}>📋 Exam tip</p>
              <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                {EXAM_TIPS[selectedNode.type]}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function btnStyle(bg, color) {
  return {
    padding: "5px 12px", fontSize: 12, fontWeight: 500,
    borderRadius: 6, border: "0.5px solid var(--color-border-secondary)",
    background: bg, color: color, cursor: "pointer"
  };
}
