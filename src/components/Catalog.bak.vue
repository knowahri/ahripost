<script setup>
import { h, ref, onBeforeMount, onMounted } from "vue";
import { NTree, NSpace, NIcon, NModal, NInput } from "naive-ui";
const { ipcRenderer } = require("electron");
import {
    JournalOutline,
} from "@vicons/ionicons5";
import Indexed from '@/utils/indexed'

const props = defineProps({
    project: Number,
})
const emit = defineEmits(['openApi'])

const db = new Indexed()
const project = ref(0)
onBeforeMount(() => {
    project.value = localStorage.getItem('project')
})

const showModal = ref(false)
const input = ref('')
const catalog_id = ref(0)
const opera = ref(0)
const expand = ref([])

const extTree = data => {
    let tmp = []
    data.forEach(node => {
        if (node.data.type == 'folder') {
            tmp.push({
                children: node.children ? extTree(node.children) : [],
                key: node.data.key,
                label: node.data.label,
                type: node.data.type
            });
        } else {
            tmp.push({
                key: node.data.key,
                label: node.data.label,
                type: node.data.type,
                method: node.data.method
            });
        }
    })
    return tmp
}

const handleDrop = ({ node, dragNode, dropPosition }) => {
    const [dragNodeSiblings, dragNodeIndex] = findSiblingsAndIndex(
        dragNode,
        catalog.value
    );
    dragNodeSiblings.splice(dragNodeIndex, 1);
    if (dropPosition === "inside") {
        if (node.children) {
            node.children.unshift(dragNode);
        } else {
            node.children = [dragNode];
        }
    } else if (dropPosition === "before") {
        const [nodeSiblings, nodeIndex] = findSiblingsAndIndex(node, catalog.value);
        nodeSiblings.splice(nodeIndex, 0, dragNode);
    } else if (dropPosition === "after") {
        const [nodeSiblings, nodeIndex] = findSiblingsAndIndex(node, catalog.value);
        nodeSiblings.splice(nodeIndex + 1, 0, dragNode);
    }
    catalog.value = Array.from(catalog.value);
    d.value.catalog = extTree(catalog.value)
    db.update('project', d.value).then(res => {
        console.log(`Update ${res}`)
    })
};

const findSiblingsAndIndex = (node, nodes) => {
    if (!nodes) return [null, null];
    for (let i = 0; i < nodes.length; ++i) {
        const siblingNode = nodes[i];
        if (siblingNode.key === node.key) return [nodes, i];
        const [siblings, index] = findSiblingsAndIndex(node, siblingNode.children);
        if (siblings) {
            console.log([siblings, index])
            return [siblings, index];
        }
    }
    return [null, null];
};

const d = ref({ catalog: [] })

const createTree = (data) => {
    let tmp = [];
    data.forEach((node) => {
        let children = null
        if (node.type == 'folder') {
            children = node.children ? createTree(node.children) : []
        }
        tmp.push({
            data: node,
            children: children,
            key: node.key,
            label: () =>
                h(
                    NSpace,
                    {
                        onclick: () => {
                            if (node.type == 'request') {
                                emit('openApi', node.key)
                            }
                        },
                        oncontextmenu: e => {
                            e.preventDefault();
                            e.stopPropagation()
                            if (node.type == 'folder') {
                                ipcRenderer.send("show-context-folder", node.key);
                            } else {
                                ipcRenderer.send("show-context-request", node.key);
                            }
                        },
                    },
                    { default: () => node.label }
                ),
            prefix: () => {
                if (node.type == "folder") {
                    return h(NIcon, { size: 18 }, { default: () => h(JournalOutline) })
                } else {
                    return h(NSpace, { class: node.method }, { default: () => node.method });
                }
            },
        });
    });
    return tmp;
};
const catalog = ref(createTree(d.value.catalog));

const createRequest = (data, key, type) => {
    let tmp = [];
    data.forEach((node) => {
        let children = node.children ? createRequest(node.children, key, type) : []
        if (node.key == key) {
            if (type == 'folder') {
                children.push({
                    children: [],
                    key: new Date().getTime(),
                    label: input.value,
                    type: type,
                })
            } else {
                children.push({
                    key: new Date().getTime(),
                    label: input.value,
                    type: type,
                    method: "GET"
                })
            }
        }
        if (node.type == 'folder') {
            tmp.push({
                children: children,
                key: node.key,
                label: node.label,
                type: node.type
            });
        } else {
            tmp.push({
                key: node.key,
                label: node.label,
                type: node.type,
                method: node.method
            });
        }
    });
    return tmp;
}

const currentRequest = (data, key) => {
    let tmp = [];
    data.forEach((node) => {
        if (node.key == key) {
            input.value = node.label
        }
    });
    return tmp;
}

const renameRequest = (data, key) => {
    let tmp = [];
    data.forEach((node) => {
        let label = node.key == key ? input.value : node.label
        if (node.type == 'folder') {
            tmp.push({
                children: node.children ? renameRequest(node.children, key) : [],
                key: node.key,
                label: label,
                type: node.type
            });
        } else {
            tmp.push({
                key: node.key,
                label: label,
                type: node.type,
                method: node.method
            });
        }
    });
    return tmp;
}

const changeRequest = (data, arg) => {
    let tmp = [];
    data.forEach((node) => {
        if (node.type == 'folder') {
            tmp.push({
                children: node.children ? changeRequest(node.children, arg) : [],
                key: node.key,
                label: node.key == arg._id ? arg.name : node.label,
                type: node.type
            });
        } else {
            tmp.push({
                key: node.key,
                label: node.key == arg._id ? arg.name : node.label,
                type: node.type,
                method: node.key == arg._id ? arg.method : node.method
            });
        }
    });
    return tmp;
}

const deleteRequest = (data, key) => {
    let tmp = [];
    data.forEach((node) => {
        if (node.key != key) {
            if (node.type == 'folder') {
                tmp.push({
                    children: node.children ? deleteRequest(node.children, key) : [],
                    key: node.key,
                    label: node.key == key ? input.value : node.label,
                    type: node.type
                });
            } else {
                tmp.push({
                    key: node.key,
                    label: node.key == key ? input.value : node.label,
                    type: node.type,
                    method: node.method
                });
            }
        } else {
            if (node.type == "request") {
                db.delete('api', node.key)
            }
        }
    });
    return tmp;
}

const handleSubmit = () => {
    switch (opera.value) {
        case 0:
            let _id = new Date().getTime()
            if (catalog_id.value == 0) {
                d.value.catalog.push({
                    key: _id,
                    label: input.value,
                    type: 'request',
                    method: 'GET'
                })
            } else {
                d.value.catalog = createRequest(d.value.catalog, catalog_id.value, 'request')
            }
            db.create('api', {
                _id: _id,
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
            catalog.value = createTree(d.value.catalog);
            break
        case 1:
            if (catalog_id.value == 0) {
                d.value.catalog.push({
                    children: [],
                    key: new Date().getTime(),
                    label: input.value,
                    type: 'folder'
                })
            } else {
                d.value.catalog = createRequest(d.value.catalog, catalog_id.value, 'folder')
            }
            catalog.value = createTree(d.value.catalog);
            break
        case 2:
            d.value.catalog = renameRequest(d.value.catalog, catalog_id.value)
            catalog.value = createTree(d.value.catalog);
            break
        case 3:
            d.value.catalog = deleteRequest(d.value.catalog, catalog_id.value)
            catalog.value = createTree(d.value.catalog);
            emit('openApi', -catalog_id.value)
            break
    }
    db.update('project', d.value).then(res => {
        console.log(`Update ${res}`)
    })
}

const handleExpandChanged = (res) => {
    expand.value = res
    db.update('expand', { _id: d.value._id, expands: res })
}

onMounted(() => {
    db.findOne('project', props.project).then(res => {
        d.value = res
        catalog.value = createTree(d.value.catalog)
        db.findOne('expand', d.value._id).then(res => {
            expand.value = res?.expands ? res.expands : []
        })
    })
    ipcRenderer.on("context-menu-create", (_, command) => {
        catalog_id.value = command
        opera.value = 0
        input.value = ''
        showModal.value = true
    });
    ipcRenderer.on("context-menu-folder", (_, command) => {
        opera.value = 1
        input.value = ''
        showModal.value = true
        catalog_id.value = command
    });
    ipcRenderer.on("context-menu-rename", (_, command) => {
        opera.value = 2
        currentRequest(d.value.catalog, command)
        showModal.value = true
        catalog_id.value = command
    });
    ipcRenderer.on("context-menu-change", (_, data) => {
        d.value.catalog = changeRequest(d.value.catalog, data)
        catalog.value = createTree(d.value.catalog);
        db.update('project', d.value).then(res => {
            console.log(`Update ${res}`)
        })
    });
    ipcRenderer.on("context-menu-delete", (_, command) => {
        opera.value = 3
        showModal.value = true
        catalog_id.value = command
    });
});
</script>

<template>
    <NModal
        v-model:show="showModal"
        :mask-closable="false"
        preset="dialog"
        title="确认"
        positive-text="确认"
        @positive-click="handleSubmit"
        @negative-click="showModal = false"
        negative-text="取消"
    >
        <div v-if="opera == 3">确认删除？</div>
        <NInput v-else v-model:value="input" type="text" clearable placeholder="请输入" />
    </NModal>
    <NTree
        block-line
        draggable
        :data="catalog"
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
