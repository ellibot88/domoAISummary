const codeengine = require('codeengine');

async function getPageDatasets(pageId) {
  if (!pageId) return { datasets: [], error: 'pageId is required' };

  const res = await codeengine.sendRequest('GET', `/api/content/v1/datasources/pages/${pageId}`);
  const sources = res.dataSources || [];

  return {
    datasets: sources.map(ds => ({
      id: String(ds.id || ''),
      name: ds.name || ds.displayName || 'Unknown',
      description: ds.description || '',
      rows: ds.rows || ds.rowCount || 0,
      columns: (ds.columns || []).map(col => ({
        name: col.name || '',
        type: col.type || 'STRING',
      })),
    })),
  };
}

async function getPageCards(pageId) {
  if (!pageId) return { cards: [], error: 'pageId is required' };

  const res = await codeengine.sendRequest('GET', `/api/content/v3/stacks/${pageId}/cards`);
  const cards = res.cards || [];

  return {
    cards: cards
      .filter(c => c.id != null)
      .map(c => ({
        id: Number(c.id),
        title: c.title || c.name || 'Untitled',
        type: c.type || c.chartType || '',
      })),
  };
}

async function getDatasetSchema(datasetId) {
  if (!datasetId) return { columns: [], error: 'datasetId is required' };

  const res = await codeengine.sendRequest('GET', `/api/query/v1/datasources/${datasetId}/schema/indexed`);
  const tables = res.tables || [];
  const columns = tables.length > 0 ? (tables[0].columns || []) : [];

  return {
    datasetName: res.name || tables[0]?.name || '',
    columns: columns.map(col => ({
      name: col.name || '',
      type: col.type || 'STRING',
    })),
  };
}

async function queryDataset(datasetId, sql) {
  if (!datasetId || !sql) return { columns: [], rows: [], error: 'datasetId and sql are required' };

  const res = await codeengine.sendRequest('POST', `/api/query/v1/execute/${datasetId}`, { sql });

  return {
    columns: res.columns || [],
    rows: res.rows || [],
    numRows: res.numRows || (res.rows?.length ?? 0),
  };
}

async function getFilesetContent(filesetId) {
  if (!filesetId) return { content: '', error: 'filesetId is required' };

  // Search files in the fileset (POST, not GET per Domo docs)
  const listRes = await codeengine.sendRequest('POST', `/api/files/v1/filesets/${filesetId}/files/search?limit=50`, {
    fieldSort: [{ field: 'name', order: 'ASC' }],
    filters: [],
  });
  const files = listRes.files || [];

  if (files.length === 0) return { content: '', fileCount: 0 };

  const chunks = [];

  for (const file of files) {
    try {
      // Get file metadata first (includes downloadUrl)
      const fileMeta = await codeengine.sendRequest('GET', `/api/files/v1/filesets/${filesetId}/files/${file.id}`);

      // Try to download the file content
      const downloadRes = await codeengine.sendRequest('GET', `/api/files/v1/filesets/${filesetId}/files/${file.id}/download`);

      let text = '';
      if (typeof downloadRes === 'string') {
        text = downloadRes;
      } else if (downloadRes && typeof downloadRes === 'object') {
        // codeengine.sendRequest returns data directly on the object
        const keys = Object.keys(downloadRes);
        if (keys.length === 1 && typeof downloadRes[keys[0]] === 'string') {
          text = downloadRes[keys[0]];
        } else {
          text = JSON.stringify(downloadRes);
        }
      }

      if (text && text.trim().length > 0 && !text.startsWith('{\"status\":')) {
        chunks.push(`--- ${file.name || file.path || 'file'} ---\n${text.trim()}`);
      }
    } catch (e) {
      // Skip files that fail to download
    }
  }

  return {
    content: chunks.join('\n\n'),
    fileCount: chunks.length,
  };
}

module.exports = { getPageDatasets, getPageCards, getDatasetSchema, queryDataset, getFilesetContent };
