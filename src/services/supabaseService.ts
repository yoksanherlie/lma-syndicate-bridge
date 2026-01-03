import { supabase } from '../lib/supabaseClient';
import { CovenantRules, FinancialHealth, HeadroomMetrics, ReconciliationItem } from '../types';

export const saveCertificate = async (
  userId: string,
  borrowerName: string,
  facilityAgent: string,
  period: string,
  covenants: CovenantRules,
  health: FinancialHealth,
  headroom: HeadroomMetrics,
  reconciliation: ReconciliationItem[]
) => {
  const payload = {
    user_id: userId,
    borrower_name: borrowerName,
    facility_agent: facilityAgent,
    period: period,
    status: 'submitted',
    data: {
      covenants,
      health,
      headroom,
      reconciliation,
    },
  };

  const { error } = await supabase.from('certificates').insert([payload]);

  if (error) {
    throw new Error(error.message);
  }
};

export const getLatestCertificate = async () => {
  const { data, error } = await supabase
    .from('certificates')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching latest certificate:', error);
    return null;
  }

  return data;
};
