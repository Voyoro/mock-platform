// database.ts
import Datastore from 'nedb'
import { join } from 'path'
import { ApiConfig } from '../utils/type'

type RecordType = Record<string, any>

export class MockDB {
  private dbMap = new Map<string, Datastore>()

  getDB(mockId: string) {
    if (!this.dbMap.has(mockId)) {
      const dbFile = join(process.cwd(), 'DB', `${mockId}.db`)
      const db = new Datastore({ filename: dbFile, autoload: true })
      this.dbMap.set(mockId, db)
    }

    return this.dbMap.get(mockId)!
  }

  // 查询列表，支持分页
  list(mockId: string, query: any = {}, apiConfig?: Record<string, any>): Promise<any> {
    const db = this.getDB(mockId);

    return new Promise((resolve, reject) => {
      db.findOne({ path: query.path }, (err, doc) => {
        if (err) return reject(err);
        if (!doc || doc.mockData == null) return resolve(null);
        let data = doc.mockData;
        // =============== case 1: 数组 ===============
        if (Array.isArray(data)) {
          resolve(this.filterAndPaginate(data, query));
          return;
        }

        // =============== case 2: 对象 + 内部 list ===============
        if (data !== null && apiConfig?.rowData && apiConfig.count && Array.isArray(data[apiConfig.rowData])) {

          const filteredList = this.filterAndPaginate(data[apiConfig.rowData], query)
          resolve({
            ...data,
            [apiConfig.rowData]: filteredList,
            [apiConfig.count]: data[apiConfig.rowData].length, // 保持 total
          });
          return;
        }
        // =============== case 3: 基础类型 / 其他对象 ===============
        resolve(data);
      });
    });
  }

  private filterAndPaginate(list: any[], query: any, apiConfig?: ApiConfig) {
    const currentPage = apiConfig?.page ?? 'currentPage'
    const numberPerPage = apiConfig?.size ?? 'numberPerPage'

    // 过滤
    let filtered = list;
    // 分页
    const page = Number(query[currentPage]) || 0;
    const size = Number(query[numberPerPage]) || filtered.length;
    const start = page * size;
    const end = start + size;
    return filtered.slice(start, end);
  }
  // 新增一条
  insert(mockId: string, item: RecordType): Promise<RecordType> {
    const db = this.getDB(mockId)
    return new Promise((resolve, reject) => {
      db.insert(item, (err, newDoc) => {
        if (err) reject(err)
        else resolve(newDoc)
      })
    })
  }

  // 更新
  update(mockId: string, query: any, patch: Partial<RecordType>): Promise<number> {
    const db = this.getDB(mockId)
    return new Promise((resolve, reject) => {
      db.update(query, { $set: patch }, {}, (err, num) => {
        if (err) reject(err)
        else resolve(num)
      })
    })
  }

  // 删除
  remove(mockId: string, query: any): Promise<number> {
    const db = this.getDB(mockId)
    return new Promise((resolve, reject) => {
      db.remove(query, {}, (err, num) => {
        if (err) reject(err)
        else resolve(num)
      })
    })
  }

  // 查询单条
  findOne(mockId: string, query: any): Promise<RecordType | null> {
    const db = this.getDB(mockId)
    return new Promise((resolve, reject) => {
      db.findOne(query, (err, doc) => {
        if (err) reject(err)
        else resolve(doc)
      })
    })
  }
  clear(mockId: string): Promise<number> {
    const db = this.getDB(mockId)
    return new Promise((resolve, reject) => {
      db.remove({}, { multi: true }, (err, numRemoved) => {
        if (err) reject(err)
        else resolve(numRemoved)
      })
    })
  }
}

export const mockDB = new MockDB()
