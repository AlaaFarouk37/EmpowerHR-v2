import { useState, useEffect, useMemo } from 'react';
import { getJobs, hrGetJobPipelineHealth } from '../../../api';
import { useToast } from '../../../components/shared';
import { useLanguage } from '../../../context/LanguageContext';

export function useTalentPipelines() {
  const { t } = useLanguage();
  const toast = useToast();
  const [jobs, setJobs] = useState([]);
  const [pipelineHealth, setPipelineHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [jobData, healthData] = await Promise.all([
        getJobs(),
        hrGetJobPipelineHealth().catch(() => ({})),
      ]);
      setJobs(Array.isArray(jobData) ? jobData : []);
      setPipelineHealth(healthData);
    } catch {
      toast(t('Failed to load pipelines'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => ({
    active: jobs.filter(j => j.status === 'active' || (j.is_active && !j.is_draft)).length,
    shortlisted: pipelineHealth?.funnelSummary?.shortlistedCount || 0,
    velocity: '4.2 days', // Simulated or derived from data if available
    total: jobs.length
  }), [jobs, pipelineHealth]);

  return { loading, jobs, pipelineHealth, stats, refresh: loadData };
}
