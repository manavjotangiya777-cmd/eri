import { initialData } from './initialData';

const STORAGE_KEY = 'crm_mock_db';

const getDb = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  let db: any;
  try {
    if (data) {
      db = JSON.parse(data);
      
      // Ensure all required tables are present even if not in initialData
      const requiredTables = ['chats', 'messages', 'chat_members', 'invoices', 'milestones', 'announcements', 'documents'];
      requiredTables.forEach(table => {
        if (!db[table]) {
          db[table] = [];
        }
      });

      // Ensure all tables from initialData are present
      Object.keys(initialData).forEach(key => {
        if (!db[key]) {
          db[key] = initialData[key];
        }
      });
      
      // Specialized merging for profiles to ensure legacy users exist
      if (initialData.profiles) {
        if (!db.profiles) db.profiles = [];
        initialData.profiles.forEach((p: any) => {
          if (!db.profiles.find((dp: any) => dp.id === p.id)) {
            db.profiles.push(p);
          }
        });
      }

      // Specialized merging for system_settings to ensure it exists and has data
      if (initialData.system_settings && (!db.system_settings || !db.system_settings.work_start_time)) {
        db.system_settings = initialData.system_settings;
      }
    } else {
      // If no data in localStorage, initialize with initialData
      db = {
        ...initialData,
        invoices: [],
        milestones: [],
        announcements: [],
        documents: [],
        chats: [],
        messages: [],
        chat_members: []
      };
    }
  } catch (err) {
    console.error('Error parsing Mock DB, resetting to initial data:', err);
    db = {
      ...initialData,
      invoices: [],
      milestones: [],
      announcements: [],
      documents: [],
      chats: [],
      messages: [],
      chat_members: []
    };
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  return db;
};

const saveDb = (db: any) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
};

export const mockDb = {
  get: (table: string) => getDb()[table] || [],
  
  find: (table: string, id: string) => {
    return getDb()[table]?.find((item: any) => item.id === id) || null;
  },

  insert: (table: string, item: any) => {
    const db = getDb();
    const newItem = { 
      ...item, 
      id: item.id || ((typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15)), 
      created_at: new Date().toISOString() 
    };
    if (!db[table]) db[table] = [];
    db[table].push(newItem);
    saveDb(db);
    return newItem;
  },

  update: (table: string, id: string, updates: any) => {
    const db = getDb();
    if (!db[table]) return null;
    const index = db[table].findIndex((item: any) => item.id === id);
    if (index === -1) return null;
    db[table][index] = { ...db[table][index], ...updates, updated_at: new Date().toISOString() };
    saveDb(db);
    return db[table][index];
  },

  delete: (table: string, id: string) => {
    const db = getDb();
    if (!db[table]) return;
    db[table] = db[table].filter((item: any) => item.id !== id);
    saveDb(db);
  },

  query: (table: string, filter: (item: any) => boolean) => {
    return (getDb()[table] || []).filter(filter);
  }
};
