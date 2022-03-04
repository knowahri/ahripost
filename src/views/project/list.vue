<script setup>
import { onBeforeMount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NTable, useMessage } from 'naive-ui'
import Indexed from '@/utils/indexed'
import lang from '@/lang/lang'
import axios from 'axios'


const route = useRoute()
const router = useRouter()
const db = new Indexed()
const projects = ref([])
const loading_page = ref(false)
const message = useMessage()

onBeforeMount(async () => {
    // token.value = localStorage.getItem('token')
    await db.open()
    projects.value = await db.find('project')
})

const handleNewProject = () => {

}

const handleOpenProject = (val) => {
    router.push({ name: 'api', params: { _id: val._id } })
}

const handleMember = () => {

}

const handleDelete = (val) => {
    db.delete('project', val._id)
    db.findMany('api', { key: 'project', value: val._id }).then(res => {
        res.forEach(api => {
            db.delete('api', api._id)
        })
    })
}

const handleSync = (val) => {
    loading_page.value = true
    db.findOne('project', val._id).then(data => {
        if (data) {
            axios.post('http://test.ahriknow.cn/api/v1/post/back/client/sync/project/', data, {
                headers: {
                    Authorization: localStorage.getItem('token')
                }
            }).then(async remote_res => {
                if (remote_res.data.data.project && remote_res.data.data.project.date > data.date) {
                    db.update('project', remote_res.data.data.project)
                    projects.value = await db.find('project')
                }
                let local_res = await db.findMany('api', { key: 'project', value: val._id })
                let remote = {}
                let locale = {}
                remote_res.data.data.apis.forEach(item => {
                    remote[item._id] = item
                })
                local_res.forEach(item => {
                    locale[item._id] = item
                })

                let await_upload = []  // 将要上传到远程的数据
                let await_download = []  // 将要上传到远程的数据的 _id
                let await_sync_to_remote = []  // 将要同步到远程的数据
                let await_sync_to_locale = []  // 将要同步到本地的数据的 _id

                // 遍历远程数据的 _id
                Object.keys(remote).forEach(k => {
                    if (locale.hasOwnProperty(k)) {
                        // 远程数据已在本地
                        if (locale[k].date > remote[k].date) {
                            // 本地数据更新，准备同步到远程的数据
                            await_sync_to_remote.push(locale[k])
                        }
                    } else {
                        // 远程数据未在本地，准备要下载到本地数据的 _id
                        await_download.push(remote[k]._id)
                    }
                })
                // 遍历本地数据的 _id
                Object.keys(locale).forEach(k => {
                    if (remote.hasOwnProperty(k)) {
                        // 本地数据已在远程
                        if (remote[k].date > locale[k].date) {
                            // 远程数据更新，准备同步到本地数据的 _id
                            await_sync_to_locale.push(remote[k]._id)
                        }
                    } else {
                        // 本地数据未在远程，准备要上传到远程的数据
                        await_upload.push(locale[k])
                    }
                })

                axios.post('http://test.ahriknow.cn/api/v1/post/back/client/sync/api/', {
                    await_upload: await_upload,
                    await_download: await_download,
                    await_sync_to_remote: await_sync_to_remote,
                    await_sync_to_locale: await_sync_to_locale
                }, {
                    headers: {
                        Authorization: localStorage.getItem('token')
                    }
                }).then(async res2 => {
                    res2.data.data.await_download.forEach(async a => {
                        await db.create('api', a)
                    })
                    res2.data.data.await_sync_to_locale.forEach(async a => {
                        await db.update('api', a)
                    })
                    // await get_data()
                    loading_page.value = false
                    message.success('同步成功')
                }).catch(err2 => {
                    message.error(err2.message)
                    loading_page.value = false
                })
            }).catch(err => {
                message.error(err.message)
                loading_page.value = false
            })
        }
    })
}

const handleDownloadProject = () => {
    axios.post('http://test.ahriknow.cn/api/v1/post/back/client/download/project/', null, {
        headers: {
            Authorization: localStorage.getItem('token')
        }
    }).then(async res => {
        if (res.data.code == 1000000) {
            let local_res = await db.findMany('project')
            res.data.data.forEach(async pro => {
                let tmp = local_res.filter(lpro => lpro._id == pro._id)
                if (tmp.length > 0) {
                    if (pro.date > tmp[0].date) {
                        await db.update('project', pro)
                        handleSync(pro._id)
                    } else {
                        // nothing
                    }
                } else {
                    await db.create('project', pro)
                    handleSync(pro)
                }
            })
            message.success('下载成功')
            projects.value = await db.find('project')
        }
    }).catch(err2 => {
        message.error(err2.message)
    })
}
</script>

<template>
    <NButton @click="handleNewProject">新建项目</NButton>
    <NButton @click="handleDownloadProject">下载项目</NButton>
    <br />
    <br />
    <NTable :bordered="false" :single-line="false" :single-column="false" size="small">
        <thead>
            <tr>
                <th style="width: 110px;">ID</th>
                <th style="width: 220px;">名称</th>
                <th>描述</th>
                <th style="width: 220px;">操作</th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="i in projects" :key="i._id">
                <td>{{ i._id }}</td>
                <td>{{ i.name }}</td>
                <td>{{ i.describe }}</td>
                <td>
                    <NButton size="small" @click="handleSync(i)">同步</NButton>
                    <NButton size="small" @click="handleOpenProject(i)">打开</NButton>
                    <NButton size="small" @click="handleMember">用户</NButton>
                    <NButton size="small" @click="handleDelete(i)">删除</NButton>
                </td>
            </tr>
        </tbody>
    </NTable>
</template>

<style scoped>
</style>
