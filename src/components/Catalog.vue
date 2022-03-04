<script setup>
import { h, ref, onMounted } from "vue";
import { NTree, NSpace, NIcon, NModal, NInput } from "naive-ui";
import axios from 'axios';
const { ipcRenderer } = require("electron");
import {
    JournalOutline,
} from "@vicons/ionicons5";
import Indexed from '@/utils/indexed'
// import { inputLight } from "naive-ui/lib/input/styles";
const db = new Indexed()

const props = defineProps({
    project: Number,
})

const key = ref(0)
const project = ref({ expand: [] })
const api_data = ref([])
const api_tree = ref([])
const expand = ref([])

const showModal = ref(false)
const input = ref('')
const inputInstRef = ref(null)

let func = null
let data = null

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

const handleSubmit = () => {
    func(data)
    input.value = ""
}

const handleExpandChanged = (res) => {
    expand.value = res
    project.value.expand = res
    db.update('project', project.value)
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
                                    ipcRenderer.send("ipc-event", {
                                        event: 'open-api',
                                        data: {
                                            _id: node._id
                                        }
                                    })
                                }
                            },
                            oncontextmenu: e => {
                                e.preventDefault();
                                e.stopPropagation()
                                ipcRenderer.send("ipc-event", {
                                    event: 'create-item',
                                    data: {
                                        _id: node._id,
                                        type: node.type
                                    }
                                })
                            },
                        },
                        { default: () => node.name }
                    ),
                prefix: () => {
                    if (node.type == 0) {
                        return h(NIcon, { size: 18 }, { default: () => h(JournalOutline) })
                    } else {
                        return h(NSpace, { class: node.method }, { default: () => node.method });
                    }
                },
            })
        }
    })
    return tmp
}

const get_data = () => {
    db.findMany('api', { key: 'project', value: props.project }).then(res => {
        api_data.value = res || []
        api_tree.value = api_data2tree(api_data.value)
        expand.value = project.value.expand
        key.value = new Date().getTime()
    })
}

const createRequest = async (data) => {
    let _id = new Date().getTime()
    await db.create('api', {
        _id: _id,
        date: _id,
        parent: data,
        type: 1,
        index: 0,
        project: props.project,
        name: input.value,
        path: '',
        method: 'GET',
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
    })
    get_data()
}

const createFolder = async (data) => {
    let _id = new Date().getTime()
    await db.create('api', {
        _id: _id,
        date: _id,
        parent: data,
        type: 0,
        index: 0,
        project: props.project,
        name: input.value,
    })
    get_data()
}

const renameItem = (data) => {
    for (let i = 0; i < api_data.value.length; i++) {
        if (data == api_data.value[i]._id) {
            api_data.value[i].name = input.value
            api_data.value[i].date = new Date().getTime()
        }
        db.update('api', api_data.value[i])
    }
    get_data()
}

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

const deleteItem = async (data, remote = false) => {
    let await_delete = findTree(api_data.value, data)
    await_delete.push(data)
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
    ipcRenderer.send("ipc-event", {
        event: 'close-api',
        data: data
    })
    get_data()
}

onMounted(() => {
    db.findOne('project', props.project).then(res => {
        project.value = res
        get_data()
    })
    ipcRenderer.on("ipc-event-catalog", (_, context) => {
        switch (context.event) {
            case 'create-request':
                showModal.value = true
                if (inputInstRef.value) {
                    let timer = setTimeout(() => {
                        inputInstRef.value.focus()
                        clearTimeout(timer)
                    }, 300)
                }
                func = createRequest
                data = context.data
                break
            case 'create-folder':
                showModal.value = true
                if (inputInstRef.value) {
                    let timer = setTimeout(() => {
                        inputInstRef.value.focus()
                        clearTimeout(timer)
                    }, 300)
                }
                func = createFolder
                data = context.data
                break
            case 'rename':
                api_data.value.forEach(item => {
                    if (context.data == item._id) {
                        input.value = item.name
                    }
                })
                showModal.value = true
                if (inputInstRef.value) {
                    let timer = setTimeout(() => {
                        inputInstRef.value.focus()
                        clearTimeout(timer)
                    }, 300)
                }
                func = renameItem
                data = context.data
                break
            case 'delete':
                deleteItem(context.data)
                break
            case 'delete-remote':
                deleteItem(context.data, true)
                break
            case 'change':
                get_data()
                break
        }
    })
})
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
        <NInput ref="inputInstRef" v-model:value="input" type="text" clearable placeholder="请输入" />
    </NModal>
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
</template>

<style scoped>
a {
    color: #42b983;
}
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
