import axios from 'axios';

// Helper: ensure we always log axios errors with request/response context
function logAxiosError(prefix: string, err: any) {
  console.error(`[${prefix}] axios error:`, {
    message: err?.message,
    code: err?.code,
    status: err?.response?.status,
    responseData: err?.response?.data,
  });
}

import { API_BASE_URL } from '@/config/api';

const previewUrl = `${API_BASE_URL}/import/bid-sheet/preview`;
const commitUrl = `${API_BASE_URL}/import/bid-sheet/commit`;


export const importService = {
  simpleImport: async (file: File): Promise<any> => {
    const form = new FormData();
    form.append('file', file);

    const url = `${API_BASE_URL}/simple-import`;
    try {
      const res = await axios.post(url, form);
      return res.data;
    } catch (err) {
      logAxiosError('SimpleImport', err);
      throw err;
    }
  },
  getImportedRows: async (): Promise<any> => {
    const url = `${API_BASE_URL}/simple-import`;
    try {
      const res = await axios.get(url);
      return res.data;
    } catch (err) {
      logAxiosError('GetImportedRows', err);
      throw err;
    }
  },
  previewBidSheet: async (file: File, token: string): Promise<any> => {
    console.log('[importService] FormData created for preview:', { name: file?.name, size: file?.size });
    const form = new FormData();
    form.append('file', file);

    console.log('[importService] API call (preview):', { url: previewUrl, authHeaderPresent: !!token });
    try {
      const res = await axios.post(previewUrl, form, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('[importService] Preview API response status:', res.status);
      return res.data;
    } catch (err) {
      logAxiosError('Preview', err);
      throw err;
    }
  },

  commitBidSheet: async (file: File, token: string): Promise<any> => {
    console.log('[importService] FormData created for commit:', { name: file?.name, size: file?.size });
    const form = new FormData();
    form.append('file', file);

    console.log('[importService] API call (commit):', { url: commitUrl, authHeaderPresent: !!token });
    try {
      const res = await axios.post(commitUrl, form, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('[importService] Commit API response status:', res.status);
      return res.data;
    } catch (err) {
      logAxiosError('Commit', err);
      throw err;
    }
  },
};


