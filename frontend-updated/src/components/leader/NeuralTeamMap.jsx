import React, { useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useLanguage } from '../../context/LanguageContext';

export function NeuralTeamMap({ members = [] }) {
  const { t } = useLanguage();

  const graphData = useMemo(() => {
    const nodes = members.map(m => ({
      id: m.id,
      name: m.name,
      role: m.role,
      val: 20,
      color: m.role?.includes('Senior') ? '#E8321A' : '#111827'
    }));

    // Generate semi-random skill connections for the "Neural" look
    const links = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (Math.random() > 0.6) {
          links.push({
            source: nodes[i].id,
            target: nodes[j].id,
            value: Math.random() * 10
          });
        }
      }
    }

    return { nodes, links };
  }, [members]);

  return (
    <div style={{ 
      background: '#fff', 
      borderRadius: 32, 
      border: '1.5px solid #F1F5F9', 
      padding: 24, 
      height: 400, 
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', margin: 0 }}>
            {t('Neural Team Connectivity')}
          </h3>
          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>Skill density & node interaction map</div>
        </div>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 10px #22C55E' }} />
      </div>

      <div style={{ width: '100%', height: 320 }}>
        <ForceGraph2D
          graphData={graphData}
          nodeLabel={node => `${node.name} (${node.role})`}
          nodeColor={node => node.color}
          linkColor={() => '#E2E8F0'}
          linkDirectionalParticles={2}
          linkDirectionalParticleSpeed={0.005}
          width={600}
          height={320}
          backgroundColor="rgba(0,0,0,0)"
        />
      </div>
    </div>
  );
}
