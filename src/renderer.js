// 创建一个类型映射
const type_map = new Map();
type_map.set("core", "核心");
type_map.set("extension", "扩展");
type_map.set("theme", "主题");
type_map.set("framew", "依赖");

const platform_map = new Map();
platform_map.set("win32", "Windows");
platform_map.set("linux", "Linux");
platform_map.set("darwin", "MacOS");


// 对比本地与远端的版本号，有新版就返回true
function compareVersion(local_version, remote_version) {
    // 将字符串改为数组
    const local_version_arr = local_version.trim().split(".");
    const remote_version_arr = remote_version.trim().split(".");
    // 返回数组长度最大的
    const max_length = Math.max(local_version_arr.length, remote_version_arr.length);
    // 从头对比每一个
    for (let i = 0; i < max_length; i++) {
        // 将字符串改为数字
        const local_version_num = parseInt(local_version_arr?.[i] ?? "0");
        const remote_version_num = parseInt(remote_version_arr?.[i] ?? "0");
        // 版本号不相等
        if (local_version_num != remote_version_num) {
            // 有更新返回true，没更新返回false
            return local_version_num < remote_version_num;
        }
    }
    // 版本号相等，返回false
    return false;
}


// 一个插件列表-插件条目生成函数
function createPluginItem() {
    const parser = new DOMParser();
    return (manifest, details, install, uninstall, update, restart) => {
        const temp = `
        <div class="wrap" data-plugin-type="${manifest.type}">
            <div class="vertical-list-item">
                <img src="${manifest?.thumbnail ?? ""}" class="thumbnail">
                <div class="info">
                    <h2 class="name">${manifest.name}</h2>
                    <p class="secondary-text description">${manifest.description}</p>
                </div>
                <div class="ops-btns">
                    <button class="q-button q-button--small q-button--secondary details">详情</button>
                    <button class="q-button q-button--small q-button--secondary install">安装</button>
                    <button class="q-button q-button--small q-button--secondary uninstall">卸载</button>
                    <button class="q-button q-button--small q-button--secondary update">更新</button>
                    <button class="q-button q-button--small q-button--secondary restart">重启</button>
                </div>
            </div>
            <hr class="horizontal-dividing-line" />
            <div class="vertical-list-item">
                <p class="secondary-text extra-information">
                    <span>类型：${type_map.get(manifest.type)}</span>
                    <span>平台：${manifest?.platform?.map(platform => platform_map.get(platform)?.toString())}</span>
                    <span>版本：${manifest.version}</span>
                    <span>开发：
                        <a href="${manifest.author[0].link}" target="_blank">${manifest.author[0].name}</a>
                    </span>
                </p>
            </div>
        </div>
        `;
        const doc = parser.parseFromString(temp, "text/html");

        // 获取按钮
        const details_btn = doc.querySelector(".details");
        const install_btn = doc.querySelector(".install");
        const uninstall_btn = doc.querySelector(".uninstall");
        const update_btn = doc.querySelector(".update");
        const restart_btn = doc.querySelector(".restart");

        // 初始化按钮功能
        details_btn.addEventListener("click", details);
        install_btn.addEventListener("click", install);
        uninstall_btn.addEventListener("click", uninstall);
        update_btn.addEventListener("click", update);
        restart_btn.addEventListener("click", restart);

        // 获取插件状态
        const local_version = LiteLoader.plugins[manifest.slug]?.manifest?.version ?? "";
        const remote_version = manifest.version;
        const is_installed = manifest.slug in LiteLoader.plugins;
        const is_updated = !compareVersion(local_version, remote_version);

        // 初始化按钮显示
        install_btn.classList.toggle("hidden", is_installed);
        uninstall_btn.classList.toggle("hidden", !(is_installed && is_updated));
        update_btn.classList.toggle("hidden", !(is_installed && !is_updated));
        restart_btn.classList.toggle("hidden", true);

        return doc.querySelector(".wrap");
    }
}


// 初始化插件列表区域
async function initPluginList(view) {
    // 获取配置文件
    const config = await plugins_marketplace.getConfig();

    const plugin_list = [];

    // 处理多个仓库源
    for (const url of config.mirrorlist) {
        const list = await (await fetch(url)).json();

        // 将每个源的列表整合到一个列表中
        list.forEach(item => {
            // 检查是否已存在相同的JSON对象
            const is_duplicate = plugin_list.some(existing_item => {
                return existing_item.repo === item.repo && existing_item.branch === item.branch;
            });

            // 如果不存在重复的JSON对象，则添加到列表中
            if (!is_duplicate) {
                plugin_list.push(item);
            }
        });
    }


    const pluginItem = createPluginItem();
    const fragment = document.createDocumentFragment();

    for (const info of plugin_list) {
        const url = `https://ghproxy.com/https://raw.githubusercontent.com/${info.repo}/${info.branch}/manifest.json`;
        const manifest = await (await fetch(url)).json();
        const plugin_item = pluginItem(
            manifest,
            // 详情
            async () => open(`https://github.com/${info.repo}/tree/${info.branch}`),
            // 安装
            async event => {
                event.target.disabled = true;
                const status_is_ok = await plugins_marketplace.install(info);
                if (status_is_ok) {
                    event.target.classList.toggle("hidden", true);
                    const parentNode = event.target.parentNode;
                    parentNode.querySelector(".restart").classList.toggle("hidden", false);
                }
                event.target.disabled = false;
            },
            // 卸载
            async event => {
                event.target.disabled = true;
                const status_is_ok = await plugins_marketplace.uninstall(manifest.slug);
                if (status_is_ok) {
                    event.target.classList.toggle("hidden", true);
                    const parentNode = event.target.parentNode;
                    parentNode.querySelector(".restart").classList.toggle("hidden", false);
                }
                event.target.disabled = false;
            },
            // 更新
            async event => {
                event.target.disabled = true;
                const status_is_ok = await plugins_marketplace.update(info, manifest.slug);
                if (status_is_ok) {
                    event.target.classList.toggle("hidden", true);
                    const parentNode = event.target.parentNode;
                    parentNode.querySelector(".restart").classList.toggle("hidden", false);
                }
                event.target.disabled = false;
            },
            // 重启
            async event => {
                event.target.disabled = true;
                await plugins_marketplace.restart();
            }
        );

        fragment.appendChild(plugin_item);
    }

    view.appendChild(fragment);
}


// 初始化列表控制区域
async function initListCtl(list_ctl, plugin_list) {
    // 搜索框
    const search_input = list_ctl.querySelector(".search-input");
    search_input.addEventListener("change", event => {

    });


    // 高级选项
    const adv_ops_btn = list_ctl.querySelector(".adv-ops-btn");
    const adv_ops_list = list_ctl.querySelector(".adv-ops-list");
    adv_ops_btn.addEventListener("click", () => {
        const icon = adv_ops_btn.querySelector(".icon");
        icon.classList.toggle("is-fold");
        adv_ops_btn.classList.toggle("is-active");
        adv_ops_list.classList.toggle("hidden");
    });


    // 选择框按钮
    const all_pulldown_menu_button = list_ctl.querySelectorAll(".q-pulldown-menu-button");
    for (const pulldown_menu_button of all_pulldown_menu_button) {
        pulldown_menu_button.addEventListener("click", event => {
            const context_menu = event.currentTarget.nextElementSibling;
            context_menu.classList.toggle("hidden");
        });
    }

    addEventListener("pointerup", event => {
        if (event.target.closest(".q-pulldown-menu-button")) {
            return
        }
        if (!event.target.closest(".q-context-menu")) {
            const all_context_menu = list_ctl.querySelectorAll(".q-context-menu");
            for (const context_menu of all_context_menu) {
                context_menu.classList.add("hidden");
            }
        }
    });


    // 获取配置文件
    const config = await plugins_marketplace.getConfig();

    // 选择框
    const pulldown_menus = list_ctl.querySelectorAll(".q-pulldown-menu");
    for (const pulldown_menu of pulldown_menus) {
        const content = pulldown_menu.querySelector(".q-pulldown-menu-button .content");
        const pulldown_menu_list = pulldown_menu.querySelector(".q-pulldown-menu-list");
        const pulldown_menu_list_items = pulldown_menu_list.querySelectorAll(".q-pulldown-menu-list-item");

        // 初始化选择框按钮显示内容
        const setValueAndAddSelectedClass = (value) => {
            const name = pulldown_menu.querySelector(`[data-value="${value}"] .content`);
            name.parentNode.classList.add("selected");
            content.value = name.textContent;
        };

        switch (pulldown_menu.dataset.id) {
            case "plugin_type_1": {
                const value = config.plugin_type[0];
                setValueAndAddSelectedClass(value);
            } break;
            case "plugin_type_2": {
                const value = config.plugin_type[1];
                setValueAndAddSelectedClass(value);
            } break;
            case "sort_order_1": {
                const value = config.sort_order[0];
                setValueAndAddSelectedClass(value);
            } break;
            case "sort_order_2": {
                const value = config.sort_order[1];
                setValueAndAddSelectedClass(value);
                plugin_list.classList.add(config.sort_order[1]);
            } break;
            case "list_style_1": {
                const value = config.list_style[0];
                setValueAndAddSelectedClass(value);
                plugin_list.classList.add(config.list_style[0]);
            } break;
            case "list_style_2": {
                const value = config.list_style[1];
                setValueAndAddSelectedClass(value);
                plugin_list.classList.add(config.list_style[1]);
            } break;
        }

        // 选择框条目点击
        pulldown_menu_list.addEventListener("click", async event => {
            const target = event.target.closest(".q-pulldown-menu-list-item");
            if (target && !target.classList.contains("selected")) {
                // 移除所有条目的选择状态
                for (const pulldown_menu_list_item of pulldown_menu_list_items) {
                    pulldown_menu_list_item.classList.remove("selected");
                }

                // 添加选择状态
                target.classList.add("selected");

                // 获取选中的选项文本
                const text_content = target.querySelector(".content").textContent;
                content.value = text_content;

                const item_value = target.dataset.value;

                // 判断是哪个选择框的，单独设置
                switch (pulldown_menu.dataset.id) {
                    case "plugin_type_1":
                        config.plugin_type = [item_value, config["plugin_type"][1]];
                        break;
                    case "plugin_type_2":
                        config.plugin_type = [config["plugin_type"][0], item_value];
                        break;
                    case "sort_order_1":
                        config.sort_order = [item_value, config["sort_order"][1]];
                        break;
                    case "sort_order_2":
                        config.sort_order = [config["sort_order"][0], item_value];
                        plugin_list.classList.remove("forward", "reverse");
                        plugin_list.classList.add(item_value);
                        break;
                    case "list_style_1":
                        config.list_style = [item_value, config["list_style"][1]];
                        plugin_list.classList.remove("single", "double");
                        plugin_list.classList.add(item_value);
                        break;
                    case "list_style_2":
                        config.list_style = [config["list_style"][0], item_value];
                        plugin_list.classList.remove("loose", "compact");
                        plugin_list.classList.add(item_value);
                        break;
                }

                // 保存配置文件
                await plugins_marketplace.setConfig(config);
            }
        });
    }
}


export async function onConfigView(view) {
    const plugin_path = LiteLoader.plugins.plugins_marketplace.path.plugin;
    const css_file_path = `file://${plugin_path}/src/style.css`;
    const html_file_path = `file://${plugin_path}/src/view.html`;

    // CSS
    const link_element = document.createElement("link");
    link_element.rel = "stylesheet";
    link_element.href = css_file_path;
    document.head.appendChild(link_element);

    // HTMl
    const html_text = await (await fetch(html_file_path)).text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html_text, "text/html");
    doc.querySelectorAll("section").forEach(node => view.appendChild(node));


    // 初始化
    const list_ctl = view.querySelector(".list-ctl");
    const plugin_list = view.querySelector(".plugin-list");
    await initListCtl(list_ctl, plugin_list);
    await initPluginList(plugin_list);
}