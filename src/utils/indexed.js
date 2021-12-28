class Indexed {
    constructor() {

    }

    async open() {
        return new Promise(async (resolve, reject) => {
            let request = window.indexedDB.open('ahripost', 1)
            request.onsuccess = e => {
                resolve(e.target.result)
            }
            request.onupgradeneeded = e => {
                let db = e.target.result
                if (!db.objectStoreNames.contains('project')) {
                    db.createObjectStore('project', { keyPath: '_id' })
                }
                if (!db.objectStoreNames.contains('api')) {
                    let objectStore = db.createObjectStore('api', { keyPath: '_id' })
                    objectStore.createIndex('project', 'project', { unique: false });
                }
                if (!db.objectStoreNames.contains('expand')) {
                    db.createObjectStore('expand', { keyPath: '_id' })
                }
                resolve(db)
            }
            request.onerror = () => {
                reject('Failed!')
            }
        })
    }

    async create(tbname, data) {
        return new Promise(async (resolve, reject) => {
            let db = await this.open()
            let request = db.transaction([tbname], 'readwrite')
                .objectStore(tbname)
                .add(data)
            request.onsuccess = e => {
                resolve('Success!')
            }
            request.onerror = () => {
                reject('Failed!')
            }
        })
    }

    async find(tbname) {
        return new Promise(async (resolve, reject) => {
            let db = await this.open()
            let request = db.transaction([tbname], 'readwrite')
                .objectStore(tbname)
                .getAll()
            request.onsuccess = e => {
                resolve(e.target.result)
            }
            request.onerror = () => {
                reject('Failed!')
            }
        })
    }

    async findOne(tbname, _id) {
        return new Promise(async (resolve, reject) => {
            let db = await this.open()
            let request = db.transaction([tbname], 'readwrite')
                .objectStore(tbname)
                .get(_id)
            request.onsuccess = e => {
                resolve(e.target.result)
            }
            request.onerror = () => {
                reject('Failed!')
            }
        })
    }

    async findMany(tbname, where) {
        return new Promise(async (resolve, reject) => {
            let db = await this.open()
            let request = db.transaction([tbname], 'readwrite')
                .objectStore(tbname).index(where.key)
                .getAll(where.value)
            request.onsuccess = e => {
                resolve(e.target.result)
            }
            request.onerror = () => {
                reject('Failed!')
            }
        })
    }

    async update(tbname, data) {
        return new Promise(async (resolve, reject) => {
            let db = await this.open()
            let request = db.transaction([tbname], 'readwrite')
                .objectStore(tbname)
                .put(JSON.parse(JSON.stringify(data)))
            request.onsuccess = e => {
                resolve(e.target.result)
            }
            request.onerror = () => {
                reject('Failed!')
            }
        })
    }

    async delete(tbname, _id) {
        return new Promise(async (resolve, reject) => {
            let db = await this.open()
            let request = db.transaction([tbname], 'readwrite')
                .objectStore(tbname)
                .delete(_id)
            request.onsuccess = e => {
                resolve(e.target.result)
            }
            request.onerror = () => {
                reject('Failed!')
            }
        })
    }
}

export default Indexed