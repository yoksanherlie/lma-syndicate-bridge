import { supabase } from '../lib/supabaseClient';
import { CovenantRules, FinancialHealth, HeadroomMetrics, ReconciliationItem } from '../types';

export const uploadAgreement = async (file: File, userId: string): Promise<string | null> => {
  if (!file) return null;
  
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('facility-agreements')
    .upload(filePath, file);

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data } = supabase.storage
    .from('facility-agreements')
    .getPublicUrl(filePath);

  return data.publicUrl;
};

export const getAgreementFile = async (url: string): Promise<Blob> => {
  // Extract path from public URL
  // Example URL: https://xyz.supabase.co/storage/v1/object/public/facility-agreements/user_id/timestamp.pdf
  const pathParts = url.split('/facility-agreements/');
  if (pathParts.length < 2) {
    throw new Error("Invalid agreement URL");
  }
  const filePath = pathParts[1];

  const { data, error } = await supabase.storage
    .from('facility-agreements')
    .download(filePath);

  if (error) {
    throw new Error(`Failed to download agreement: ${error.message}`);
  }

  return data;
};

export const uploadComplianceCertificate = async (blob: Blob, userId: string): Promise<string> => {
  const fileName = `${userId}/compliance_cert_${Date.now()}.pdf`;
  
  const { error: uploadError } = await supabase.storage
    .from('compliance-of-certificate')
    .upload(fileName, blob, {
      contentType: 'application/pdf'
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data } = supabase.storage
    .from('compliance-of-certificate')
    .getPublicUrl(fileName);

  return data.publicUrl;
};

export const saveCertificate = async (
  userId: string,
  borrowerName: string,
  facilityAgent: string,
  period: string,
  covenants: CovenantRules,
  health: FinancialHealth,
  headroom: HeadroomMetrics,
  reconciliation: ReconciliationItem[],
  documentUrl?: string | null,
  status: string = 'submitted'
) => {
  const payload = {
    user_id: userId,
    borrower_name: borrowerName,
    facility_agent: facilityAgent,
    period: period,
    status: status,
    document_url: documentUrl || null,
    data: {
      covenants,
      health,
      headroom,
      reconciliation,
    },
  };

  const { data, error } = await supabase
    .from('certificates')
    .insert([payload])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const saveComplianceArtifact = async (
  certificateId: string,
  artifactUrl: string,
  artifactType: 'compliance_certificate' | 'supporting_doc' = 'compliance_certificate'
) => {
  const { data, error } = await supabase
    .from('compliance_artifacts')
    .insert([{
      certificate_id: certificateId,
      url: artifactUrl,
      type: artifactType,
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save artifact: ${error.message}`);
  }

  return data;
};

export const updateCertificateStatus = async (id: string, status: string) => {
  const { data, error } = await supabase
    .from('certificates')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Update failed: ${error.message}`);
  }

  return data;
};

export const getLatestComplianceArtifact = async (certificateId: string) => {
  const { data, error } = await supabase
    .from('compliance_artifacts')
    .select('url')
    .eq('certificate_id', certificateId)
    .eq('type', 'compliance_certificate')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found"
    console.error('Error fetching artifact:', error);
    return null;
  }

  return data?.url || null;
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
