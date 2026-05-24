import { useMemo } from 'react';

export function useOrgStats(employees = []) {
  const departmentStats = useMemo(() => {
    const map = {};
    employees.forEach(emp => {
      const d = emp.department || 'Unassigned';
      if (!map[d]) map[d] = { name: d, employees: 0, teams: new Set() };
      map[d].employees++;
      if (emp.team) map[d].teams.add(emp.team);
    });
    return Object.values(map).map(d => ({ ...d, teamCount: d.teams.size }));
  }, [employees]);

  const teamStats = useMemo(() => {
    const map = {};
    employees.forEach(emp => {
      const t = emp.team || 'No Team';
      if (!map[t]) map[t] = { name: t, department: emp.department || 'Unassigned', members: 0 };
      map[t].members++;
    });
    return Object.values(map);
  }, [employees]);

  return { departmentStats, teamStats };
}
