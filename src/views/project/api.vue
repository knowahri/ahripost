<script setup>
import { h, onBeforeMount, onMounted, ref, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
    NLayout, NLayoutSider, NTree, NIcon, NSpace, NTabs,
    NTab, NTabPane, NGrid, NGi, NTable, NInputGroup,
    NSelect, NInput, NButton, NCheckbox, NTag,
    NRadioGroup, NRadio, NDivider, NDropdown, NModal, useMessage
} from 'naive-ui'
import { JournalOutline, CloseOutline, CodeWorking } from "@vicons/ionicons5";
import Indexed from '@/utils/indexed'
import { format } from '@/utils/helper'
// import lang from '@/lang/lang'
import axios from 'axios'
import * as monaco from 'monaco-editor'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
// import { K } from '../../dist/assets/jsonWorker.c09b170c'
self.MonacoEnvironment = {
    getWorker(workerId, label) {
        if (label === 'json') {
            return new JsonWorker()
        }
        return new EditorWorker()
    },
}
const { ipcRenderer } = require("electron")


const message = useMessage()
const route = useRoute()
const router = useRouter()
const db = new Indexed()
const project = ref({})
const api_data = ref([])
const api_tree = ref([])
const expand = ref([])
const key = ref(0)
const loading_page = ref(false)
const loading = ref(false)
const tab = ref('Params')
const reqEditor = ref();
const resEditor = ref();
const showModal = ref(false)
const new_api_parent = ref(0)
const new_api = ref({ name: '' })

let reqInstance;
let resInstance;
const showWelcome = ref(true)

const addable = ref(false)
const handleClose = (val) => {
    if (val == 0) {
        if (project.value.tabs.length == 0) {
            return
        }
        showWelcome.value = false
        project.value.tab = project.value.tabs[0]
        return
    }
    const index = project.value.tabs.findIndex(api => api === val);
    if (!~index)
        return;
    project.value.tabs = project.value.tabs.filter(api => api !== val)
    if (val === project.value.tab) {
        project.value.tab = project.value.tabs[Math.min(index, project.value.tabs.length - 1)];
    }
    if (project.value.tabs.length == 0) {
        showWelcome.value = true
        project.value.tab = 0
    }
    db.update('project', project.value)
}
const closable = ref(true)
const handleAdd = () => {

}
const get_folder = (p = 0) => {
    return {
        _id: 0,
        date: 0,
        parent: p,
        type: 0,
        index: 0,
        project: project.value._id,
        name: '',
    }
}
const get_request = (p = 0) => {
    return {
        _id: 0,
        date: 0,
        parent: p,
        type: 1,
        index: 0,
        project: project.value._id,
        name: '',
        path: '',
        method: 'GET',
        tab: 'Params',
        params: [],
        body: {
            type: 'json',
            data: [],
            json: {}
        },
        headers: [],
        response: {
            status: 0,
            headers: [],
            data: {}
        }
    }
}
const get_api = () => {
    let l = api_data.value.filter(a => a._id == project.value.tab)
    if (l.length > 0) {
        return l[0]
    }
    return get_request()
}
const api = ref(get_api())
const path = computed({
    get() {
        let res = api.value.path
        let query = []
        api.value.params.forEach(param => {
            let k = param.key.trim()
            if (param.enable && k.length > 0)
                query.push(`${k}=${param.value.trim()}`)
        })
        if (query.length > 0) {
            res += `?${query.join('&')}`
        }
        return res
    },
    set(val) {
        api.value.path = val.split('?')[0]
    }
})

const findSiblingsAndIndex = (node, nodes) => {
    if (!nodes)
        return [null, null]
    for (let i = 0; i < nodes.length; ++i) {
        const siblingNode = nodes[i]
        if (siblingNode.key === node.key)
            return [nodes, i]
        const [siblings, index] = findSiblingsAndIndex(node, siblingNode.children)
        if (siblings) {
            return [siblings, index]
        }
    }
    return [null, null]
}

const handleDrop = ({ node, dragNode, dropPosition }) => {
    let p = api_data.value.filter(a => a._id == node.key)
    let c = api_data.value.filter(a => a._id == dragNode.key)
    const [dragNodeSiblings, dragNodeIndex] = findSiblingsAndIndex(
        dragNode,
        api_tree.value
    );
    dragNodeSiblings.splice(dragNodeIndex, 1)
    if (p.length > 0 && c.length > 0) {
        c[0].parent = p[0].parent
    }
    if (dropPosition === "inside") {
        if (node.children) {
            node.children.unshift(dragNode)
        } else {
            node.children = [dragNode]
        }
        if (p.length > 0 && c.length > 0) {
            c[0].parent = p[0]._id
        }
    } else if (dropPosition === "before") {
        const [nodeSiblings, nodeIndex] = findSiblingsAndIndex(node, api_tree.value)
        nodeSiblings.splice(nodeIndex, 0, dragNode)
    } else if (dropPosition === "after") {
        const [nodeSiblings, nodeIndex] = findSiblingsAndIndex(node, api_tree.value)
        nodeSiblings.splice(nodeIndex + 1, 0, dragNode)
    }
    if (p.length > 0 && c.length > 0) {
        db.update('api', c[0])
    }
    api_tree.value = Array.from(api_tree.value)
}

const api_data2tree = (data, parent = 0) => {
    let tmp = []
    data.forEach(node => {
        if (node.parent == parent) {
            tmp.push({
                children: node.type == 0 ? api_data2tree(data, node._id) : null,
                key: node._id,
                label: () =>
                    h(
                        NSpace,
                        {
                            onclick: () => {
                                if (node.type > 0) {
                                    if (project.value.tabs.indexOf(node._id) == -1) {
                                        project.value.tabs.push(node._id)
                                        db.update('project', project.value)
                                    }
                                    handleApiTabChanged(node._id)
                                }
                            },
                            oncontextmenu: e => {
                                e.preventDefault();
                                e.stopPropagation()
                                handleContextMenu(e, node)
                            },
                        },
                        { default: () => node.name }
                    ),
                prefix: () => {
                    if (node.type == 0) {
                        return h(NIcon, {
                            size: 18,
                            onclick: () => {
                                if (node.type > 0) {
                                    if (project.value.tabs.indexOf(node._id) == -1) {
                                        project.value.tabs.push(node._id)
                                    }
                                    handleApiTabChanged(node._id)
                                }
                            },
                            oncontextmenu: e => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleContextMenu(e, node)
                            }
                        }, { default: () => h(JournalOutline) })
                    } else {
                        return h(NSpace, {
                            class: node.method,
                            onclick: () => {
                                if (node.type > 0) {
                                    if (project.value.tabs.indexOf(node._id) == -1) {
                                        project.value.tabs.push(node._id)
                                    }
                                    handleApiTabChanged(node._id)
                                }
                            },
                            oncontextmenu: e => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleContextMenu(e, node)
                            }
                        }, { default: () => node.method });
                    }
                },
            })
        }
    })
    return tmp
}

const get_data = async () => {
    let res_api = await db.findMany('api', { key: 'project', value: project.value._id })
    api_data.value = res_api || []
    api_tree.value = api_data2tree(api_data.value)
    key.value++
}

onBeforeMount(async () => {
    let _id = parseInt(route.params._id || '0')
    project.value = await db.findOne('project', _id)
    expand.value = project.value.expand
    await get_data()
    handleApiTabChanged(project.value.tab)
})
const handleKeyDown = async (e) => {
    api.value.date = new Date().getTime()
    await db.update('api', api.value)
    await get_data()
    message.success("Saved!")
}
window.addEventListener("keydown", e => {
    if (api.value._id > 0) {
        if (e.ctrlKey && e.key == 's') {
            handleKeyDown()
        }
    }
})
onMounted(() => {
    let theme = 'vs'
    if (localStorage.getItem('theme') == 'dark') {
        theme = 'vs-dark'
    }
    reqInstance = monaco.editor.create(reqEditor.value, {
        language: 'json',
        tabSize: 4,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        theme: theme
    })

    reqInstance.onDidChangeModelContent(() => {
        const value = reqInstance.getValue();
        api.value.body.json = JSON.parse(value)
    });

    resInstance = monaco.editor.create(resEditor.value, {
        language: 'json',
        tabSize: 4,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        theme: theme
    })
})

const handleExpandChanged = (res) => {
    expand.value = res
    project.value.expand = res
    db.update('project', project.value)
}

const handleInput = () => {
    if (tab.value == 'Params') {
        api.value.params.push({
            _id: new Date().getTime(),
            enable: true,
            key: '',
            value: '',
            describe: '',
            must: false
        })
    } else if (tab.value == 'Headers') {
        api.value.headers.push({
            _id: new Date().getTime(),
            enable: true,
            key: '',
            value: '',
            describe: '',
            must: false
        })
    } else if (tab.value == 'Body') {
        api.value.body.data.push({
            _id: new Date().getTime(),
            enable: true,
            key: '',
            value: '',
            describe: '',
            must: false
        })
    }
}

const handleFormat = () => {

}

ipcRenderer.on("response", (_, response) => {
    loading.value = false
    if (response.hasOwnProperty('status')) {
        api.value.response = response
        resInstance.setValue(JSON.stringify(api.value.response.data))
        resInstance.getAction('editor.action.formatDocument').run()
    } else {
        message.error(response.message)
    }
})
const handleSend = () => {
    api.value.date = new Date().getTime()
    loading.value = true
    let options = {
        path: path.value,
        method: api.value.method
    }
    if (['POST', 'PUT'].indexOf(api.value.method) != -1) {
        if (api.value.body.type == 'json') {
            options.data = api.value.body.json
        } else {
            options.data = {}
            api.value.body.data.forEach(d => {
                options.data[d.key] = d.value
            })
        }
    }
    if (api.value.headers.length > 0) {
        options.headers = {}
        api.value.headers.forEach(d => {
            options.headers[d.key] = d.value
        })
    }
    ipcRenderer.send("request", JSON.parse(JSON.stringify(options)));
}

const handleSave = () => {

}

const handleTabChanged = (val) => {
    api.value.tab = val
    tab.value = val
}

const handleApiTabChanged = (val) => {
    project.value.tab = val
    db.update('project', project.value)
    let current_api = api_data.value.filter(api => api._id == val)
    if (current_api.length > 0) {
        api.value = current_api[0]
        reqInstance.setValue(JSON.stringify(api.value.body.json))
        reqInstance.getAction('editor.action.formatDocument').run()
        resInstance.setValue(JSON.stringify(api.value.response.data))
        resInstance.getAction('editor.action.formatDocument').run()
    }
}

const options = ref([])
const showDropdown = ref(false)
const x = ref(0);
const y = ref(0);
const handleContextMenu = (e, node) => {
    e.preventDefault();
    if (node) {
        new_api.value = node
        new_api_parent.value = node._id
    } else {
        new_api_parent.value = 0
    }
    //#region 右键菜单  
    if (node) {
        if (node.type > 0) {
            options.value = [
                {
                    label: "重命名",
                    key: "rename"
                },
                {
                    label: "删除",
                    key: "delete"
                },
            ]
        } else {
            options.value = [
                {
                    label: "新建请求",
                    key: "new-request"
                },
                {
                    label: "新建文件夹",
                    key: "new-folder"
                },
                {
                    type: "divider",
                    key: "d1"
                },
                {
                    label: "重命名",
                    key: "rename"
                },
                {
                    label: "删除",
                    key: "delete"
                },
            ]
        }
    } else {
        options.value = [
            {
                label: "新建请求",
                key: "new-request"
            },
            {
                label: "新建文件夹",
                key: "new-folder"
            },
        ]
    }
    //#endregion
    showDropdown.value = false;
    nextTick().then(() => {
        showDropdown.value = true;
        x.value = e.clientX;
        y.value = e.clientY;
    });
}
const onClickoutside = () => {
    showDropdown.value = false;
}

// 删除文件夹，寻找该文件夹的子项
const findTree = (data, _id) => {
    let tmp = []
    data.forEach(api => {
        if (api.parent == _id) {
            tmp.push(api._id)
            tmp = tmp.concat(findTree(data, api._id))
        }
    })
    return tmp
}

// 右键菜单
const handleSelect = async (key) => {
    showDropdown.value = false;
    switch (key) {
        case 'new-request':
            new_api.value = get_request(new_api_parent.value)
            showModal.value = true
            break
        case 'new-folder':
            new_api.value = get_folder(new_api_parent.value)
            showModal.value = true
            break
        case 'rename':
            showModal.value = true
            break
        case 'delete':
            let await_delete = findTree(api_data.value, new_api.value._id)
            await_delete.push(new_api.value._id)
            let remote = true
            if (remote) {
                await axios.post('http://test.ahriknow.cn/api/v1/post/back/client/delete/api/', {
                    await_delete: await_delete,
                }, {
                    headers: {
                        Authorization: localStorage.getItem('token')
                    }
                })
            }
            await_delete.forEach(async _id => {
                await db.delete('api', _id)
            })
            await get_data()
            break
    }
}

// 创建接口
const handleSubmit = async () => {
    let _id = new Date().getTime()
    if (new_api.value._id > 0) {
        await db.update('api', JSON.parse(JSON.stringify(new_api.value)))
    } else {
        new_api.value._id = _id
        new_api.value.date = _id
        await db.create('api', JSON.parse(JSON.stringify(new_api.value)))
    }
    await get_data()
}

// 同步当前项目所有接口
const handleSync = async () => {
    loading_page.value = true
    db.findOne('project', project.value._id).then(data => {
        if (data) {
            axios.post('http://test.ahriknow.cn/api/v1/post/back/client/sync/project/', data, {
                headers: {
                    Authorization: localStorage.getItem('token')
                }
            }).then(async remote_res => {
                console.log(remote_res.data.data.apis)
                if (remote_res.data.data.project) {
                    console.log(remote_res.data.data.project)
                }
                if (remote_res.data?.code != 1000000) {
                    message.error(remote_res.data.msg)
                    return
                }

                let local_res = await db.findMany('api', { key: 'project', value: project.value._id })
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
                    await get_data()
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

const handleToProject = () => {
    router.push({ name: 'list' })
}
</script>

<template>
    <NModal
        v-model:show="showModal"
        :mask-closable="false"
        preset="dialog"
        title="确认"
        positive-text="确认"
        :display-directive="'show'"
        @positive-click="handleSubmit"
        @negative-click="showModal = false"
        negative-text="取消"
    >
        <NInput
            ref="inputInstRef"
            v-model:value="new_api.name"
            type="text"
            clearable
            placeholder="请输入"
        />
    </NModal>
    <n-layout style="height: 100%">
        <n-layout position="absolute" style="top: 0; bottom: 0" has-sider>
            <n-layout-sider bordered @contextmenu="handleContextMenu($event, null)">
                <n-dropdown
                    placement="bottom-start"
                    trigger="manual"
                    :x="x"
                    :y="y"
                    :options="options"
                    :show="showDropdown"
                    :on-clickoutside="onClickoutside"
                    @select="handleSelect"
                />
                <div style="display: flex;justify-content: space-between;">
                    <NButton @click="handleSync" quaternary>Sync</NButton>
                    <NButton @click="handleToProject" quaternary>Close</NButton>
                </div>
                <NDivider style="margin: 0;" />
                <NTree
                    :key="key"
                    block-line
                    draggable
                    :data="api_tree"
                    @drop="handleDrop"
                    :expanded-keys="expand"
                    :expand-on-dragenter="true"
                    :on-update:expanded-keys="handleExpandChanged"
                />
            </n-layout-sider>
            <n-layout content-style="padding: 10px; height: 100%" :native-scrollbar="false">
                <n-tabs
                    v-model:value="project.tab"
                    type="card"
                    :addable="addable"
                    :closable="closable"
                    tab-style="min-width: 80px;"
                    @close="handleClose"
                    @add="handleAdd"
                    style="margin-bottom: 10px"
                    @update:value="handleApiTabChanged"
                >
                    <n-tab v-show="showWelcome" :name="0">Welcome</n-tab>
                    <n-tab
                        v-for="i in api_data.filter(api => project.tabs.indexOf(api._id) != -1)"
                        :name="i._id"
                    >
                        <NSpace :class="i.method">{{ i.method }}</NSpace>
                        &nbsp;
                        {{ i.name }}
                    </n-tab>
                </n-tabs>
                <NSpace v-if="project.tab == 0">Welcome {{ project.tab == 0 }}</NSpace>
                <NGrid v-show="project.tab > 0" x-gap="12" :cols="1">
                    <NGi>
                        <NInputGroup>
                            <NSelect
                                style="width: 140px;"
                                placeholder="Method"
                                v-model:value="api.method"
                                :options="[
                                    {
                                        label: 'GET',
                                        value: 'GET'
                                    },
                                    {
                                        label: 'POST',
                                        value: 'POST'
                                    },
                                    {
                                        label: 'PUT',
                                        value: 'PUT'
                                    },
                                    {
                                        label: 'DELETE',
                                        value: 'DELETE'
                                    },
                                    {
                                        label: 'PATCH',
                                        value: 'PATCH'
                                    },
                                ]"
                            ></NSelect>
                            <NInput
                                @keyup.enter="handleSend"
                                @blur="handleSave"
                                v-model:value="path"
                                placeholder="Api Path"
                            />
                            <NButton
                                style="width: 100px;"
                                :loading="loading"
                                @click="handleSend"
                            >SEND</NButton>
                        </NInputGroup>
                    </NGi>
                    <NGi>
                        <NTabs
                            :value="api.tab || 'Params'"
                            size="small"
                            @update:value="handleTabChanged"
                        >
                            <NTabPane name="Params" tab="Params" display-directive="show">
                                <NTable size="small">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>键</th>
                                            <th>值</th>
                                            <th>描述</th>
                                            <th>必须</th>
                                            <th>删除</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="param in api.params" :key="param._id">
                                            <td style="text-align: center;">
                                                <NCheckbox v-model:checked="param.enable"></NCheckbox>
                                            </td>
                                            <td>
                                                <NInput
                                                    size="small"
                                                    v-model:value="param.key"
                                                    placeholder="Key"
                                                />
                                            </td>
                                            <td>
                                                <NInput
                                                    size="small"
                                                    v-model:value="param.value"
                                                    placeholder="Value"
                                                />
                                            </td>
                                            <td>
                                                <NInput
                                                    size="small"
                                                    v-model:value="param.describe"
                                                    placeholder="Describe"
                                                />
                                            </td>
                                            <td style="text-align: center;">
                                                <NCheckbox v-model:checked="param.must"></NCheckbox>
                                            </td>
                                            <td style="text-align: center;">
                                                <NButton
                                                    @click="handleDelete(param._id)"
                                                    text
                                                    size="small"
                                                >
                                                    <template #icon>
                                                        <NIcon style="line-height: 32px;">
                                                            <CloseOutline />
                                                        </NIcon>
                                                    </template>
                                                </NButton>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td></td>
                                            <td>
                                                <NButton @click="handleInput" size="small">New Param</NButton>
                                            </td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                        </tr>
                                    </tbody>
                                </NTable>
                            </NTabPane>
                            <NTabPane name="Body" tab="Body" display-directive="show">
                                <NRadioGroup v-model:value="api.body.type" name="radiogroup">
                                    <NSpace style="padding-bottom: 10px;">
                                        <NRadio value="json">Json</NRadio>
                                        <NRadio value="data">Data</NRadio>
                                    </NSpace>
                                </NRadioGroup>
                                <div
                                    v-show="api.body.type == 'json'"
                                    style="height: 200px;"
                                    ref="reqEditor"
                                    id="reqEditor"
                                ></div>
                                <NTable v-show="api.body.type == 'data'" size="small">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>键</th>
                                            <th>值</th>
                                            <th>描述</th>
                                            <th>必须</th>
                                            <th>删除</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="data in api.body.data" :key="data._id">
                                            <td style="text-align: center;">
                                                <NCheckbox v-model:checked="data.enable"></NCheckbox>
                                            </td>
                                            <td>
                                                <NInput
                                                    size="small"
                                                    v-model:value="data.key"
                                                    placeholder="Key"
                                                />
                                            </td>
                                            <td>
                                                <NInput
                                                    size="small"
                                                    v-model:value="data.value"
                                                    placeholder="Value"
                                                />
                                            </td>
                                            <td>
                                                <NInput
                                                    size="small"
                                                    v-model:value="data.describe"
                                                    placeholder="Describe"
                                                />
                                            </td>
                                            <td style="text-align: center;">
                                                <NCheckbox v-model:checked="data.must"></NCheckbox>
                                            </td>
                                            <td style="text-align: center;">
                                                <NButton
                                                    @click="handleDelete(data._id)"
                                                    text
                                                    size="small"
                                                >
                                                    <template #icon>
                                                        <NIcon style="line-height: 32px;">
                                                            <CloseOutline />
                                                        </NIcon>
                                                    </template>
                                                </NButton>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td></td>
                                            <td>
                                                <NButton @click="handleInput" size="small">New Data</NButton>
                                            </td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                        </tr>
                                    </tbody>
                                </NTable>
                            </NTabPane>
                            <NTabPane name="Headers" tab="Headers" display-directive="show">
                                <NTable size="small">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>键</th>
                                            <th>值</th>
                                            <th>描述</th>
                                            <th>必须</th>
                                            <th>删除</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="header in api.headers" :key="header._id">
                                            <td style="text-align: center;">
                                                <NCheckbox v-model:checked="header.enable"></NCheckbox>
                                            </td>
                                            <td>
                                                <NInput
                                                    size="small"
                                                    v-model:value="header.key"
                                                    placeholder="Key"
                                                />
                                            </td>
                                            <td>
                                                <NInput
                                                    size="small"
                                                    v-model:value="header.value"
                                                    placeholder="Value"
                                                />
                                            </td>
                                            <td>
                                                <NInput
                                                    size="small"
                                                    v-model:value="header.describe"
                                                    placeholder="Describe"
                                                />
                                            </td>
                                            <td style="text-align: center;">
                                                <NCheckbox v-model:checked="header.must"></NCheckbox>
                                            </td>
                                            <td style="text-align: center;">
                                                <NButton
                                                    @click="handleDelete(header._id)"
                                                    text
                                                    size="small"
                                                >
                                                    <template #icon>
                                                        <NIcon style="line-height: 32px;">
                                                            <CloseOutline />
                                                        </NIcon>
                                                    </template>
                                                </NButton>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td></td>
                                            <td>
                                                <NButton
                                                    @click="handleInput"
                                                    size="small"
                                                >New Header</NButton>
                                            </td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                        </tr>
                                    </tbody>
                                </NTable>
                            </NTabPane>
                        </NTabs>
                    </NGi>
                    <NGi>
                        <NDivider />
                    </NGi>
                    <NGi>
                        <NTabs default-value="Response" size="small">
                            <template #suffix>
                                <NTag
                                    v-show="api.response.status > 0"
                                    :type="api.response.status == 200 ? 'success' : (api.response.status < 500 ? 'warning' : 'error')"
                                >{{ api.response.status }}&nbsp;{{ api.response.status != 200 ? api.response.data.detail : '' }}</NTag>
                                <NButton
                                    style="font-size: 12px; margin-left: 20px"
                                    @click="handleFormat"
                                    size="small"
                                    title="Format"
                                >
                                    <template #icon>
                                        <NIcon>
                                            <CodeWorking />
                                        </NIcon>
                                    </template>
                                </NButton>
                            </template>
                            <NTabPane name="Response" tab="Response" display-directive="show">
                                <div style="height: 300px;" ref="resEditor"></div>
                                <!-- <n-input
                                        type="textarea"
                                        readonly="true"
                                        v-model:value="response_data"
                                        placeholder="response"
                                        :autosize="{
                                            minRows: 3
                                        }"
                                />-->
                            </NTabPane>
                            <NTabPane name="Headers" tab="Headers" display-directive="show">
                                <NTable size="small">
                                    <thead>
                                        <tr>
                                            <th>Key</th>
                                            <th>Value</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="(v, k) in api.response.headers" :key="k">
                                            <td>{{ k }}</td>
                                            <td>{{ v }}</td>
                                        </tr>
                                    </tbody>
                                </NTable>
                            </NTabPane>
                        </NTabs>
                        <p>Request At: {{ format(api.date) }}</p>
                    </NGi>
                </NGrid>
            </n-layout>
        </n-layout>
    </n-layout>
</template>

<style scoped>
</style>
<style>
.GET {
    font-size: 12px;
    color: #42b983;
}
.POST {
    font-size: 12px;
    color: #d1b147;
}
.PUT {
    font-size: 12px;
    color: #3dacd8;
}
.DELETE {
    font-size: 12px;
    color: #d13636;
}
.PATCH {
    font-size: 12px;
    color: #bf35d1;
}
</style>
