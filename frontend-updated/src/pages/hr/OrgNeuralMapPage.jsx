import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useLanguage } from '../../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { hrGetTalentGraph } from '../../api/recruitment';
import { useAuth } from '../../context/AuthContext';
import { Spinner, Badge, Btn } from '../../components/shared/index.jsx';
import { 
  Brain, 
  Network, 
  Zap, 
  Maximize, 
  X, 
  Activity, 
  Users, 
  Settings2, 
  Info, 
  ShieldAlert, 
  TrendingUp, 
  Target, 
  Sparkles,
  Search,
  Globe
} from 'lucide-react';

const RISK_COLORS = {
   'High': '#FF3B30',    // Vibrant Neural Red
   'Medium': '#FF9500',  // Neural Amber
   'Low': '#34C759'      // Stability Green
};

const DEPT_COLORS = {
   'Engineering': '#007AFF', 
   'Product': '#AF52DE', 
   'Marketing': '#5856D6', 
   'Sales': '#FF2D55', 
   'HR': '#5AC8FA',
   'Finance': '#FFCC00'
};

const SKILL_COLORS = {
   'Technical': '#34C759', 
   'Leadership': '#FF9500', 
   'Soft Skills': '#FF2D55',
   'General': '#8E8E93'
};

export function HROrgNeuralMapPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [data, setData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showStabilityMap, setShowStabilityMap] = useState(false);
  const [showSkillMap, setShowSkillMap] = useState(false);
  const [showGhostNodes, setShowGhostNodes] = useState(false);
  const [timeRewind, setTimeRewind] = useState(100); // 0 (1yr ago) to 100 (now)
  const [showPowerRoadmap, setShowPowerRoadmap] = useState(false);
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [deactivatedNodes, setDeactivatedNodes] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const fgRef = useRef();
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const graphData = await hrGetTalentGraph();
        const nodes = graphData.nodes.map(n => ({
          ...n,
          name: n.label,
          title: n.role,
          riskLevel: n.riskScore > 0.7 ? 'High' : (n.riskScore > 0.4 ? 'Medium' : 'Low')
        }));
        setData({ nodes, links: graphData.links });
        
        setTimeout(() => {
          if (fgRef.current) {
            // Strategic Padding: 30% buffer (240px) to ensure nodes "fly" with space around them
            fgRef.current.zoomToFit(800, 240);
            
            // Neural Physics Calibration:
            // Strengthen repulsion so nodes spread out, but keep them in the "context"
            fgRef.current.d3Force('charge').strength(-200);
            fgRef.current.d3Force('center').strength(0.05); // Soft centering to prevent "caging"
          }
        }, 1000);
      } catch (err) {
        console.error("Failed to fetch talent graph", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    const updateDimensions = () => {
      if (containerRef.current) {
        // Strategic Layout Bust: Expand to absolute edges
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight - 80 // Adjust for top navbar
        });
      }
    };

    fetchData();
    window.addEventListener('resize', updateDimensions);
    updateDimensions();
    
    // Ensure "Neural Freedom" applies even after navigation
    const timer = setTimeout(updateDimensions, 100);
    return () => {
      window.removeEventListener('resize', updateDimensions);
      clearTimeout(timer);
    };
  }, []);

  const handleNodeClick = useCallback(node => {
    fgRef.current.centerAt(node.x, node.y, 600);
    fgRef.current.zoom(2.5, 600);
    setSelectedNode(node);
  }, []);

  const filteredData = useMemo(() => {
    let nodes = data.nodes;
    let links = data.links;

    // Time Rewind Logic
    const now = new Date();
    const rewindDate = new Date();
    rewindDate.setMonth(now.getMonth() - (12 - (timeRewind / 100 * 12)));
    
    nodes = nodes.filter(n => {
       if (n.isGhost) return showGhostNodes;
       if (!n.hireDate) return true;
       return new Date(n.hireDate) <= rewindDate;
    });

    // Cleanup links for removed nodes
    links = links.filter(l => {
       const targetId = typeof l.target === 'object' ? l.target.id : l.target;
       const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
       return nodes.some(n => n.id === targetId) && nodes.some(n => n.id === sourceId);
    });

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      nodes = nodes.map(n => ({
        ...n,
        isHighlighted: (n.name?.toLowerCase().includes(lowerQuery) || n.title?.toLowerCase().includes(lowerQuery))
      }));
    }

    return { nodes, links };
  }, [data, searchQuery, showGhostNodes, timeRewind]);

  if (loading) {
    return (
      <div style={{ height: 'calc(100vh - 120px)', display: 'grid', placeItems: 'center', background: '#0B0E14', borderRadius: 32 }}>
         <div style={{ textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, margin: '0 auto 24px', border: '3px solid rgba(220, 38, 38, 0.1)', borderTopColor: 'var(--red-600)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <div style={{ color: '#fff', fontSize: 14, fontWeight: 900, letterSpacing: '0.1em' }}>INITIALIZING NEURAL PROJECTION...</div>
         </div>
      </div>
    );
  }

   return (
      <div 
         ref={containerRef}
         style={{ 
            width: '100%', 
            height: 'calc(100vh - 100px)', // Precise height to prevent scroll
            position: 'relative',
            background: '#0B0E14',
            overflow: 'hidden',
            margin: 0,
            padding: 0,
            border: 'none',
            borderRadius: 0
         }}
      >
         <style dangerouslySetInnerHTML={{ __html: `
            /* Neural Space Override: Kill all parent borders and padding */
            .page-content { 
              padding: 0 !important; 
              margin: 0 !important; 
              border: none !important; 
              background: #0B0E14 !important;
              max-width: none !important;
              height: 100vh !important;
              overflow: hidden !important;
            }
            .card { border: none !important; box-shadow: none !important; background: transparent !important; }
         `}} />
         {/* Top Header Overlay */}
         <div style={{ 
            position: 'absolute', 
            top: 24, 
            left: 24, 
            right: 24, 
            zIndex: 100, 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            pointerEvents: 'none' 
         }}>
            <div style={{ pointerEvents: 'auto' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ 
                     width: 32, 
                     height: 32, 
                     borderRadius: 8, 
                     background: 'rgba(220, 38, 38, 0.1)', 
                     display: 'flex', 
                     alignItems: 'center', 
                     justifyContent: 'center',
                     border: '1px solid rgba(220, 38, 38, 0.2)'
                  }}>
                     <Globe size={18} color="#dc2626" />
                  </div>
                  <div>
                     <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                        Strategic Neural Projection
                     </h1>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626', boxShadow: '0 0 8px #dc2626' }} />
                        <span style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                           Global Talent Grid Active
                        </span>
                     </div>
                  </div>
               </div>
            </div>

            <div style={{ display: 'flex', gap: 12, pointerEvents: 'auto' }}>
               <div style={{ position: 'relative' }}>
                  <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} size={16} />
                  <input 
                     type="text" 
                     placeholder="Locate Node..." 
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     style={{ 
                        background: 'rgba(255,255,255,0.03)', 
                        border: '1px solid rgba(255,255,255,0.08)', 
                        borderRadius: 12, 
                        padding: '10px 16px 10px 40px', 
                        color: '#fff', 
                        fontSize: 13,
                        width: 240,
                        outline: 'none',
                        transition: 'all 0.3s ease'
                     }}
                     onFocus={(e) => e.target.style.background = 'rgba(255,255,255,0.06)'}
                     onBlur={(e) => e.target.style.background = 'rgba(255,255,255,0.03)'}
                  />
               </div>
               <button 
                  onClick={() => setShowGhostNodes(!showGhostNodes)}
                  style={{
                     background: showGhostNodes ? '#007AFF' : 'rgba(255,255,255,0.03)',
                     border: '1px solid rgba(255,255,255,0.08)',
                     borderRadius: 12,
                     padding: '0 20px',
                     height: 42,
                     color: '#fff',
                     fontSize: 13,
                     fontWeight: 700,
                     display: 'flex',
                     alignItems: 'center',
                     gap: 10,
                     cursor: 'pointer',
                     transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                     boxShadow: showGhostNodes ? '0 8px 24px rgba(0, 122, 255, 0.3)' : 'none'
                  }}
               >
                  <Sparkles size={18} />
                  {showGhostNodes ? 'Growth Roadmap' : 'Show Vacancies'}
               </button>
               <button 
                  onClick={() => setIsSimulationMode(!isSimulationMode)}
                  style={{
                     background: isSimulationMode ? '#AF52DE' : 'rgba(255,255,255,0.03)',
                     border: '1px solid rgba(255,255,255,0.08)',
                     borderRadius: 12,
                     padding: '0 20px',
                     height: 42,
                     color: '#fff',
                     fontSize: 13,
                     fontWeight: 700,
                     display: 'flex',
                     alignItems: 'center',
                     gap: 10,
                     cursor: 'pointer',
                     transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                     boxShadow: isSimulationMode ? '0 8px 24px rgba(175, 82, 222, 0.3)' : 'none'
                  }}
               >
                  <Network size={18} />
                  {isSimulationMode ? 'Simulator Active' : 'What-If Simulator'}
               </button>
               <button 
                  onClick={() => {
                     setShowSkillMap(!showSkillMap);
                     setShowStabilityMap(false);
                  }}
                  style={{
                     background: showSkillMap ? '#34C759' : 'rgba(255,255,255,0.03)',
                     border: '1px solid rgba(255,255,255,0.08)',
                     borderRadius: 12,
                     padding: '0 20px',
                     height: 42,
                     color: '#fff',
                     fontSize: 13,
                     fontWeight: 700,
                     display: 'flex',
                     alignItems: 'center',
                     gap: 10,
                     cursor: 'pointer',
                     transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                     boxShadow: showSkillMap ? '0 8px 24px rgba(52, 199, 89, 0.3)' : 'none'
                  }}
               >
                  <Brain size={18} />
                  {showSkillMap ? 'Neural Capabilities' : 'Skill Heatmap'}
               </button>
               <button 
                  onClick={() => {
                     setShowStabilityMap(!showStabilityMap);
                     setShowSkillMap(false);
                  }}
                  style={{
                     background: showStabilityMap ? 'var(--red-600)' : 'rgba(255,255,255,0.03)',
                     border: '1px solid rgba(255,255,255,0.08)',
                     borderRadius: 12,
                     padding: '0 20px',
                     height: 42,
                     color: '#fff',
                     fontSize: 13,
                     fontWeight: 700,
                     display: 'flex',
                     alignItems: 'center',
                     gap: 10,
                     cursor: 'pointer',
                     transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                     boxShadow: showStabilityMap ? '0 8px 24px rgba(220, 38, 38, 0.3)' : 'none'
                  }}
               >
                  <Activity size={18} />
                  {showStabilityMap ? 'Neural Stability' : 'Stability Pulse'}
               </button>
            </div>
         </div>

      {/* Bottom Right: Tools */}
      <div style={{ position: 'absolute', bottom: 32, right: 32, zIndex: 100, display: 'grid', gap: 12 }}>
         <button 
           onClick={() => setShowPowerRoadmap(true)}
           style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer', backdropFilter: 'blur(10px)' }}
           title="Neural Strategy"
         >
            <Info size={18} />
         </button>
         <button 
           onClick={() => fgRef.current.zoomToFit(600)}
           style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer', backdropFilter: 'blur(10px)' }}
           title="Reset Projection"
         >
            <Maximize size={18} />
         </button>
      </div>

      {/* Chronos Time Travel Slider */}
      <div style={{ 
         position: 'absolute', 
         bottom: 90, 
         left: '50%', 
         transform: 'translateX(-50%)',
         zIndex: 100,
         width: 400,
         background: 'rgba(11, 14, 20, 0.4)',
         padding: '12px 24px',
         borderRadius: 20,
         border: '1px solid rgba(255,255,255,0.05)',
         backdropFilter: 'blur(10px)'
      }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>12 Months Ago</span>
            <span style={{ fontSize: 11, fontWeight: 900, color: '#fff' }}>
               {new Date(new Date().setMonth(new Date().getMonth() - (12 - (timeRewind / 100 * 12)))).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </span>
            <span style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Now</span>
         </div>
         <input 
            type="range" 
            min="0" 
            max="100" 
            value={timeRewind}
            onChange={(e) => setTimeRewind(parseInt(e.target.value))}
            style={{ 
               width: '100%', 
               height: 4, 
               background: 'rgba(255,255,255,0.1)', 
               borderRadius: 2,
               appearance: 'none',
               outline: 'none',
               cursor: 'pointer'
            }} 
         />
      </div>

      {/* Legend Overlay - Bottom Center */}
      <div style={{ 
         position: 'absolute', 
         bottom: 32, 
         left: '50%', 
         transform: 'translateX(-50%)',
         zIndex: 100, 
         background: 'rgba(11, 14, 20, 0.6)', 
         borderRadius: 24, 
         padding: '12px 32px', 
         border: '1px solid rgba(255,255,255,0.08)', 
         backdropFilter: 'blur(20px)',
         boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
      }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
               <Users size={14} color="rgba(255,255,255,0.3)" />
               <span style={{ fontSize: 13, fontWeight: 900, color: '#fff' }}>{filteredData.nodes.filter(n => !n.isGhost && n.role !== 'Department').length}</span>
            </div>
            <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }} />
            <div style={{ display: 'flex', gap: 16 }}>
               {(showSkillMap ? Object.entries(SKILL_COLORS) : (showStabilityMap ? Object.entries(RISK_COLORS) : Object.entries(DEPT_COLORS))).map(([key, color]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                     <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}` }} />
                     <span style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{key}</span>
                  </div>
               ))}
            </div>
            <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }} />
            <div style={{ display: 'flex', gap: 16 }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 16, height: 2, background: 'var(--red-600)', borderRadius: 1 }} />
                  <span style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Hierarchy</span>
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 16, height: 1, background: 'rgba(255,255,255,0.15)', borderRadius: 1 }} />
                  <span style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Peer</span>
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(0, 122, 255, 0.4)', border: '1px solid #007AFF' }} />
                  <span style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Vacancy</span>
               </div>
               {isSimulationMode && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                     <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#AF52DE', animation: 'pulse 1.5s infinite' }} />
                     <span style={{ fontSize: 10, fontWeight: 900, color: '#AF52DE', textTransform: 'uppercase' }}>Simulation Active</span>
                  </div>
               )}
            </div>
         </div>
      </div>

      <ForceGraph2D
        ref={fgRef}
        graphData={filteredData}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="#0B0E14" 
        d3AlphaDecay={0.01} // Slower decay = nodes move more freely for longer
        d3VelocityDecay={0.1} // Lower friction for free movement
        nodeLabel={node => `${node.name} • ${node.role}`}
        linkColor={link => {
          if (link.type === 'hierarchy') return 'var(--red-600)';
          if (link.type === 'structural') return 'rgba(255,255,255,0.12)';
          if (link.type === 'peer') return 'rgba(255,255,255,0.06)';
          return 'rgba(255,255,255,0.03)';
        }}
        linkWidth={link => {
          if (link.type === 'hierarchy') return 1.5;
          if (link.type === 'structural') return 1.0;
          return 0.5;
        }}
        linkDirectionalParticles={link => (link.type === 'influence' || link.type === 'hierarchy') ? 2 : 0}
        linkDirectionalParticleSpeed={link => link.type === 'hierarchy' ? 0.01 : 0.005}
        linkDirectionalParticleColor={link => link.type === 'hierarchy' ? 'var(--red-600)' : 'rgba(220, 38, 38, 0.2)'}
        linkDirectionalParticleWidth={1.5}
        onNodeClick={handleNodeClick}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const isDeactivated = deactivatedNodes.has(node.id);
          const isGhost = node.isGhost;
          let color = isDeactivated ? '#333' : (showStabilityMap ? RISK_COLORS[node.riskLevel] : DEPT_COLORS[node.dept] || '#888');
          
          if (isGhost) color = 'rgba(0, 122, 255, 0.6)';
          if (showSkillMap && !isDeactivated && !isGhost) {
             color = SKILL_COLORS[node.skillCat] || SKILL_COLORS['General'];
          }
          
          let size = node.role === 'Department' ? 6 : 4;
          if (showSkillMap && node.role !== 'Department' && !isGhost) {
             size = 3 + (node.skillLevel || 1);
          }
          if (isGhost) size = 5;

          const isHighlighted = node.isHighlighted;
          
          // Check if impacted by a deactivated manager
          let isImpacted = false;
          if (isSimulationMode && !isDeactivated && !isGhost) {
             const managerLink = data.links.find(l => {
                const targetId = typeof l.target === 'object' ? l.target.id : l.target;
                return targetId === node.id && l.type === 'hierarchy';
             });
             if (managerLink) {
                const sourceId = typeof managerLink.source === 'object' ? managerLink.source.id : managerLink.source;
                if (deactivatedNodes.has(sourceId)) isImpacted = true;
             }
          }

          if ((showStabilityMap || isImpacted || showSkillMap || isGhost) && (node.riskScore > 0.6 || showSkillMap || isGhost)) {
             const t = Date.now() / 1000;
             const glow = (Math.sin(t * 3) + 1) / 2;
             ctx.beginPath();
             const glowRadius = size + 2 + (glow * (isImpacted ? 12 : (isGhost ? 10 : (showSkillMap ? 6 : 8))));
             ctx.arc(node.x, node.y, glowRadius, 0, 2 * Math.PI, false);
             
             if (isGhost) {
                ctx.fillStyle = `rgba(0, 122, 255, ${glow * 0.2})`;
             } else if (showSkillMap) {
                ctx.fillStyle = `${color}${Math.floor(glow * 20).toString(16).padStart(2, '0')}`;
             } else {
                ctx.fillStyle = isImpacted ? `rgba(255, 59, 48, ${glow * 0.3})` : `${color}${Math.floor(glow * 30).toString(16).padStart(2, '0')}`;
             }
             ctx.fill();
          }

          if (isGhost) {
             ctx.setLineDash([2, 2]);
             ctx.beginPath();
             ctx.arc(node.x, node.y, size + 2, 0, 2 * Math.PI, false);
             ctx.strokeStyle = '#007AFF';
             ctx.lineWidth = 1;
             ctx.stroke();
             ctx.setLineDash([]);
          }

          if (isHighlighted) {
             ctx.beginPath();
             ctx.arc(node.x, node.y, size + 4, 0, 2 * Math.PI, false);
             ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
             ctx.lineWidth = 1;
             ctx.stroke();
          }

          ctx.beginPath();
          ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
          ctx.fillStyle = color;
          ctx.fill();

          const label = node.name;
          const fontSize = 11/globalScale;
          ctx.font = `${fontSize}px Inter`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = isHighlighted ? '#fff' : 'rgba(255,255,255,0.6)';
          ctx.fillText(label, node.x + size + 3, node.y);
        }}
      />

      {/* Node Dossier Overlay */}
      {selectedNode && (
        <div style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', zIndex: 101, width: 420 }}>
           <div style={{ background: 'rgba(22, 27, 34, 0.8)', borderRadius: 28, padding: 32, border: '1.5px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(40px)', boxShadow: '0 40px 80px -20px rgba(0,0,0,0.8)' }}>
              <button 
                onClick={() => setSelectedNode(null)} 
                style={{ position: 'absolute', top: 24, right: 24, background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: 32, height: 32, color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
              >
                <X size={16} />
              </button>

              <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 28 }}>
                 <div style={{ 
                    width: 64, height: 64, borderRadius: 20, background: 'var(--red-600)', 
                    display: 'grid', placeItems: 'center', fontSize: 24, fontWeight: 900, color: '#fff'
                 }}>
                    {selectedNode.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                 </div>
                 <div>
                    <h2 style={{ fontSize: 24, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>{selectedNode.name}</h2>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginTop: 4 }}>{selectedNode.title}</div>
                 </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
                 <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 20, border: '1.5px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                       <Zap size={14} style={{ color: '#EAB308' }} />
                       <span style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Performance</span>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#fff' }}>{selectedNode.performance} <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>/ 5</span></div>
                 </div>
                 <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 20, border: '1.5px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                       <ShieldAlert size={14} style={{ color: 'var(--red-600)' }} />
                       <span style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Stability</span>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: selectedNode.riskScore > 0.6 ? 'var(--red-600)' : '#fff' }}>{Math.round((1 - selectedNode.riskScore) * 100)}%</div>
                 </div>
              </div>

               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
                  <button 
                     title="Send Sync Message"
                     style={{ height: 48, borderRadius: 16, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                     onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                     onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  >
                     <Users size={18} />
                  </button>
                  <button 
                     title="Send Neural Recognition"
                     style={{ 
                        height: 48, borderRadius: 16, 
                        background: selectedNode.performance >= 4 ? 'rgba(255, 204, 0, 0.1)' : 'rgba(255,255,255,0.05)', 
                        border: selectedNode.performance >= 4 ? '1px solid rgba(255, 204, 0, 0.3)' : '1px solid rgba(255,255,255,0.08)', 
                        color: selectedNode.performance >= 4 ? '#FFCC00' : '#fff', 
                        display: 'grid', placeItems: 'center', cursor: 'pointer' 
                     }}
                  >
                     <Sparkles size={18} />
                  </button>
                  <button 
                     title="Schedule Stay Interview"
                     style={{ 
                        height: 48, borderRadius: 16, 
                        background: selectedNode.riskScore > 0.6 ? 'rgba(255, 59, 48, 0.1)' : 'rgba(255,255,255,0.05)', 
                        border: selectedNode.riskScore > 0.6 ? '1px solid rgba(255, 59, 48, 0.3)' : '1px solid rgba(255,255,255,0.08)', 
                        color: selectedNode.riskScore > 0.6 ? '#FF3B30' : '#fff', 
                        display: 'grid', placeItems: 'center', cursor: 'pointer' 
                     }}
                  >
                     <Target size={18} />
                  </button>
               </div>

               <div style={{ display: 'flex', gap: 12 }}>
                  <Btn 
                    onClick={() => navigate(`/hr/employees?id=${selectedNode.id}`)}
                    variant="primary" 
                    style={{ flex: 1, height: 52, borderRadius: 14, background: '#fff', color: '#0B0E14', border: 'none', fontWeight: 900, fontSize: 14 }}
                  >
                     Dossier
                  </Btn>
                  {isSimulationMode && (
                     <Btn 
                        onClick={() => {
                           const newDeactivated = new Set(deactivatedNodes);
                           if (newDeactivated.has(selectedNode.id)) {
                              newDeactivated.delete(selectedNode.id);
                           } else {
                              newDeactivated.add(selectedNode.id);
                           }
                           setDeactivatedNodes(newDeactivated);
                        }}
                        style={{ 
                           flex: 1.5, 
                           height: 52, 
                           borderRadius: 14, 
                           background: deactivatedNodes.has(selectedNode.id) ? '#34C759' : 'rgba(255, 59, 48, 0.1)', 
                           color: deactivatedNodes.has(selectedNode.id) ? '#fff' : '#FF3B30', 
                           border: deactivatedNodes.has(selectedNode.id) ? 'none' : '1px solid rgba(255, 59, 48, 0.2)',
                           fontWeight: 900, 
                           fontSize: 13 
                        }}
                     >
                        {deactivatedNodes.has(selectedNode.id) ? 'Restore Node' : 'Simulate Departure'}
                     </Btn>
                  )}
               </div>
           </div>
        </div>
      )}

      {/* Strategic Roadmap Modal */}
      {showPowerRoadmap && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(15px)', display: 'grid', placeItems: 'center', padding: 40 }}>
           <div style={{ background: '#161B22', borderRadius: 32, width: '100%', maxWidth: 840, border: '1.5px solid rgba(255,255,255,0.08)', overflow: 'hidden', boxShadow: '0 50px 100px -20px rgba(0,0,0,1)' }}>
              <div style={{ padding: 48, borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                 <div>
                    <h2 style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: 0 }}>Neural Strategy Roadmap</h2>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '8px 0 0' }}>Strategic projection of Organizational Intelligence capabilities</p>
                 </div>
                 <button onClick={() => setShowPowerRoadmap(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: 48, height: 48, color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                    <X size={24} />
                 </button>
              </div>

              <div style={{ padding: 48, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                 {[
                   { title: 'Influence Networks', desc: 'Reveal latent cross-functional hubs and informal influence clusters beyond formal hierarchy.', icon: Network, color: 'var(--red-600)' },
                   { title: 'Stability Forecast', desc: 'Predictive attrition heatmaps. Identify and resolve stability vulnerabilities before they trigger.', icon: ShieldAlert, color: 'var(--red-800)' },
                   { title: 'Structural Simulator', desc: 'Drag-and-drop structural shifts. Simulate organizational changes with real-time performance projections.', icon: TrendingUp, color: '#EAB308' },
                   { title: 'Skill-Gap Matrix', desc: 'Visualize collective proficiency nodes. Pinpoint exact expertise shortages in your talent grid.', icon: Brain, color: '#8B5CF6' },
                 ].map(item => (
                   <div key={item.title} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 28, border: '1.5px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.05)', borderRadius: 10, display: 'grid', placeItems: 'center', marginBottom: 20 }}>
                         <item.icon size={20} style={{ color: item.color }} />
                      </div>
                      <h3 style={{ fontSize: 16, fontWeight: 900, color: '#fff', margin: '0 0 10px' }}>{item.title}</h3>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, margin: 0 }}>{item.desc}</p>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }
      `}} />
    </div>
  );
}
