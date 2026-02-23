const ProxmoxApi = require('./proxmoxApi');
const { loadProxmoxNodes } = require('../config/proxmox');
const { proxmoxCpuUsage, proxmoxMemUsage, proxmoxNodeStatus } = require('../config/prometheus');

/**
 * Generates realistic-looking demo telemetry data
 */
function generateDemoTelemetry() {
    const nodes = [
        { id: 1, name: 'Node-1', host: 'https://192.168.1.101:8006' },
        { id: 2, name: 'Node-2', host: 'https://192.168.1.102:8006' },
        { id: 3, name: 'Node-3', host: 'https://192.168.1.103:8006' },
    ];

    return nodes.map((node) => {
        const cpuBase = 15 + Math.random() * 45;
        const memBase = 40 + Math.random() * 35;
        const diskBase = 30 + Math.random() * 40;

        return {
            nodeId: node.id,
            nodeName: node.name,
            host: node.host,
            status: 'online',
            uptime: Math.floor(86400 + Math.random() * 2592000),
            cpu: {
                usage: parseFloat(cpuBase.toFixed(1)),
                cores: 16,
                frequency: 3.5,
                model: 'Intel Xeon E5-2680 v4',
            },
            memory: {
                usage: parseFloat(memBase.toFixed(1)),
                total: 64 * 1024 * 1024 * 1024,
                used: parseFloat(((memBase / 100) * 64 * 1024 * 1024 * 1024).toFixed(0)),
                free: parseFloat((((100 - memBase) / 100) * 64 * 1024 * 1024 * 1024).toFixed(0)),
            },
            storage: {
                usage: parseFloat(diskBase.toFixed(1)),
                total: 2 * 1024 * 1024 * 1024 * 1024,
                used: parseFloat(((diskBase / 100) * 2 * 1024 * 1024 * 1024 * 1024).toFixed(0)),
                free: parseFloat((((100 - diskBase) / 100) * 2 * 1024 * 1024 * 1024 * 1024).toFixed(0)),
            },
            network: {
                inRate: parseFloat((Math.random() * 100).toFixed(2)),
                outRate: parseFloat((Math.random() * 50).toFixed(2)),
            },
        };
    });
}

/**
 * Generates demo VM list
 */
function generateDemoVMs() {
    const statuses = ['running', 'stopped', 'running', 'running', 'stopped', 'running', 'running', 'running'];
    const vmNames = [
        'web-server-01', 'db-primary', 'api-gateway', 'monitoring-stack',
        'backup-agent', 'mail-server', 'dev-environment', 'load-balancer',
        'redis-cache', 'elk-stack', 'gitlab-runner', 'vpn-server',
    ];
    const nodeNames = ['Node-1', 'Node-2', 'Node-3'];

    return vmNames.map((name, i) => ({
        vmid: 100 + i,
        name,
        status: statuses[i % statuses.length],
        node: nodeNames[i % 3],
        cpu: parseFloat((Math.random() * 80).toFixed(1)),
        mem: parseFloat((Math.random() * 90).toFixed(1)),
        maxmem: (2 + Math.floor(Math.random() * 14)) * 1024 * 1024 * 1024,
        disk: parseFloat((Math.random() * 70).toFixed(1)),
        maxdisk: (20 + Math.floor(Math.random() * 80)) * 1024 * 1024 * 1024,
        uptime: statuses[i % statuses.length] === 'running' ? Math.floor(Math.random() * 2592000) : 0,
        netin: Math.floor(Math.random() * 1000000000),
        netout: Math.floor(Math.random() * 500000000),
        ipAddress: `10.0.${Math.floor(i / 4)}.${10 + i}`,
        os: ['Ubuntu 22.04', 'Debian 12', 'CentOS 9', 'Windows Server 2022'][i % 4],
    }));
}

/**
 * Generates demo storage data
 */
function generateDemoStorage() {
    return [
        { storage: 'local', type: 'dir', content: 'images,rootdir', total: 500 * 1024 * 1024 * 1024, used: 180 * 1024 * 1024 * 1024, avail: 320 * 1024 * 1024 * 1024, node: 'Node-1', active: 1 },
        { storage: 'local-lvm', type: 'lvmthin', content: 'images,rootdir', total: 1000 * 1024 * 1024 * 1024, used: 450 * 1024 * 1024 * 1024, avail: 550 * 1024 * 1024 * 1024, node: 'Node-1', active: 1 },
        { storage: 'ceph-pool', type: 'rbd', content: 'images', total: 2000 * 1024 * 1024 * 1024, used: 890 * 1024 * 1024 * 1024, avail: 1110 * 1024 * 1024 * 1024, node: 'All', active: 1 },
        { storage: 'nfs-backup', type: 'nfs', content: 'backup,iso', total: 4000 * 1024 * 1024 * 1024, used: 2100 * 1024 * 1024 * 1024, avail: 1900 * 1024 * 1024 * 1024, node: 'All', active: 1 },
        { storage: 'local', type: 'dir', content: 'images,rootdir', total: 500 * 1024 * 1024 * 1024, used: 210 * 1024 * 1024 * 1024, avail: 290 * 1024 * 1024 * 1024, node: 'Node-2', active: 1 },
        { storage: 'local-lvm', type: 'lvmthin', content: 'images,rootdir', total: 1000 * 1024 * 1024 * 1024, used: 520 * 1024 * 1024 * 1024, avail: 480 * 1024 * 1024 * 1024, node: 'Node-2', active: 1 },
        { storage: 'local', type: 'dir', content: 'images,rootdir', total: 500 * 1024 * 1024 * 1024, used: 150 * 1024 * 1024 * 1024, avail: 350 * 1024 * 1024 * 1024, node: 'Node-3', active: 1 },
        { storage: 'local-lvm', type: 'lvmthin', content: 'images,rootdir', total: 1000 * 1024 * 1024 * 1024, used: 380 * 1024 * 1024 * 1024, avail: 620 * 1024 * 1024 * 1024, node: 'Node-3', active: 1 },
    ];
}

/**
 * Fetch telemetry from all Proxmox nodes
 */
async function fetchTelemetry() {
    const mode = process.env.MODE || 'demo';

    if (mode === 'demo') {
        const data = generateDemoTelemetry();
        // Update prometheus metrics
        data.forEach((node) => {
            proxmoxNodeStatus.set({ node_name: node.nodeName }, 1);
            proxmoxCpuUsage.set({ node_name: node.nodeName }, node.cpu.usage);
            proxmoxMemUsage.set({ node_name: node.nodeName }, node.memory.usage);
        });
        return data;
    }

    // Live mode - fetch from real Proxmox API
    const nodes = loadProxmoxNodes();
    const results = await Promise.all(
        nodes.map(async (node) => {
            const api = new ProxmoxApi(node);
            const status = await api.getNodeStatus();
            if (!status) {
                proxmoxNodeStatus.set({ node_name: node.name }, 0);
                return {
                    nodeId: node.id,
                    nodeName: node.name,
                    host: node.host,
                    status: 'offline',
                    cpu: { usage: 0 },
                    memory: { usage: 0 },
                    storage: { usage: 0 },
                };
            }

            const cpuUsage = parseFloat(((status.cpu || 0) * 100).toFixed(1));
            const memUsage = parseFloat(
                (((status.memory?.used || 0) / (status.memory?.total || 1)) * 100).toFixed(1)
            );

            proxmoxNodeStatus.set({ node_name: node.name }, 1);
            proxmoxCpuUsage.set({ node_name: node.name }, cpuUsage);
            proxmoxMemUsage.set({ node_name: node.name }, memUsage);

            return {
                nodeId: node.id,
                nodeName: node.name,
                host: node.host,
                status: 'online',
                uptime: status.uptime,
                cpu: {
                    usage: cpuUsage,
                    cores: status.cpuinfo?.cpus || 0,
                    model: status.cpuinfo?.model || 'Unknown',
                },
                memory: {
                    usage: memUsage,
                    total: status.memory?.total || 0,
                    used: status.memory?.used || 0,
                    free: status.memory?.free || 0,
                },
                storage: {
                    usage: parseFloat(
                        (((status.rootfs?.used || 0) / (status.rootfs?.total || 1)) * 100).toFixed(1)
                    ),
                    total: status.rootfs?.total || 0,
                    used: status.rootfs?.used || 0,
                    free: status.rootfs?.avail || 0,
                },
            };
        })
    );

    return results;
}

/**
 * Fetch all VMs from all nodes
 */
async function fetchAllVMs() {
    const mode = process.env.MODE || 'demo';
    if (mode === 'demo') return generateDemoVMs();

    const nodes = loadProxmoxNodes();
    const allVMs = [];
    for (const node of nodes) {
        const api = new ProxmoxApi(node);
        const vms = await api.getVMs();
        if (vms) {
            // Fetch IP and OS info for each VM in parallel
            const enriched = await Promise.all(
                vms.map(async (vm) => {
                    const vmData = { ...vm, node: node.name, ipAddress: null, os: null };

                    // Only query guest agent for running VMs
                    if (vm.status === 'running') {
                        try {
                            // Fetch network interfaces and OS info in parallel
                            const [netResult, osResult, configResult] = await Promise.all([
                                api.getVMAgentNetwork(vm.vmid).catch(() => null),
                                api.getVMAgentOSInfo(vm.vmid).catch(() => null),
                                api.getVMConfig(vm.vmid).catch(() => null),
                            ]);

                            // Extract IP address (skip loopback, pick first non-loopback IPv4)
                            if (netResult && netResult.result) {
                                for (const iface of netResult.result) {
                                    if (iface.name === 'lo') continue;
                                    const ipEntry = iface['ip-addresses']?.find(
                                        (ip) => ip['ip-address-type'] === 'ipv4'
                                    );
                                    if (ipEntry) {
                                        vmData.ipAddress = ipEntry['ip-address'];
                                        break;
                                    }
                                }
                            }

                            // Extract OS info from guest agent
                            if (osResult && osResult.result) {
                                const r = osResult.result;
                                vmData.os = r['pretty-name'] || r.name || null;
                            }

                            // Fallback: get OS type from VM config
                            if (!vmData.os && configResult) {
                                const ostype = configResult.ostype;
                                if (ostype) {
                                    const osMap = {
                                        l26: 'Linux (2.6+)',
                                        l24: 'Linux (2.4)',
                                        win11: 'Windows 11',
                                        win10: 'Windows 10',
                                        win8: 'Windows 8',
                                        win7: 'Windows 7',
                                        w2k8: 'Windows Server 2008',
                                        w2k19: 'Windows Server 2019',
                                        w2k22: 'Windows Server 2022',
                                        wvista: 'Windows Vista',
                                        wxp: 'Windows XP',
                                        solaris: 'Solaris',
                                        other: 'Other',
                                    };
                                    vmData.os = osMap[ostype] || ostype;
                                }
                            }
                        } catch (err) {
                            // Guest agent may not be installed - silently continue
                        }
                    } else {
                        // For stopped VMs, try to get OS from config
                        try {
                            const config = await api.getVMConfig(vm.vmid);
                            if (config?.ostype) {
                                const osMap = {
                                    l26: 'Linux (2.6+)',
                                    l24: 'Linux (2.4)',
                                    win11: 'Windows 11',
                                    win10: 'Windows 10',
                                    win8: 'Windows 8',
                                    win7: 'Windows 7',
                                    w2k8: 'Windows Server 2008',
                                    w2k19: 'Windows Server 2019',
                                    w2k22: 'Windows Server 2022',
                                    wvista: 'Windows Vista',
                                    wxp: 'Windows XP',
                                    solaris: 'Solaris',
                                    other: 'Other',
                                };
                                vmData.os = osMap[config.ostype] || config.ostype;
                            }
                        } catch (err) {
                            // Silently continue
                        }
                    }

                    return vmData;
                })
            );
            allVMs.push(...enriched);
        }
    }
    return allVMs;
}

/**
 * Fetch storage from all nodes
 */
async function fetchAllStorage() {
    const mode = process.env.MODE || 'demo';
    if (mode === 'demo') return generateDemoStorage();

    const nodes = loadProxmoxNodes();
    const allStorage = [];
    for (const node of nodes) {
        const api = new ProxmoxApi(node);
        const storage = await api.getStorage();
        if (storage) {
            storage.forEach((s) => {
                // Use Proxmox's actual active status (1 = mounted, 0 = disabled/not mounted)
                allStorage.push({
                    ...s,
                    node: node.name,
                    active: s.active === 1,
                });
            });
        }
    }
    return allStorage;
}

module.exports = { fetchTelemetry, fetchAllVMs, fetchAllStorage, generateDemoTelemetry };
