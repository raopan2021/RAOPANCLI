import { defineConfig } from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
	title: 'raopan 的前端脚手架',
	description: '实现自己的脚手架',
	base: 'RAOPANCLI',
	// 是否忽略死链
	ignoreDeadLinks: false,
	// 最后更新于 开关
	lastUpdated: true,
	// markdown配置
	markdown: {
		lineNumbers: true,
		container: {
			tipLabel: '提示',
			warningLabel: '警告',
			dangerLabel: '危险',
			infoLabel: '信息',
			detailsLabel: '详细信息',
		},
	},
	themeConfig: {
		lastUpdated: {
			text: '最近更新时间',
			formatOptions: {
				dateStyle: 'short',
				timeStyle: 'medium',
			},
		},
		darkModeSwitchLabel: '主题',
		sidebarMenuLabel: '菜单',
		returnToTopLabel: '回到顶部',
		// 显示层级
		outline: { level: 'deep', label: '当前页' },
		siteTitle: 'Home',
		// 上一页下一页文本
		docFooter: { prev: '上一篇', next: '下一篇' },
		// 每个页面页脚的编辑此页  :path  为当前路由
		editLink: {
			text: '在GitHub上编辑此页',
			pattern: 'https://github.com/raopan2021/blog/edit/main/docs/:path',
		},
		footer: {
			message: 'Released under the MIT License.',
			copyright:
				'Copyright © 2018-present raopan 饶盼 base on VitePress ',
		},

		// https://vitepress.dev/reference/default-theme-config
		nav: [
			{ text: '首页', link: '/' },
			{ text: '模块', link: '/modules/index', activeMatch: '/modules/' },
			{
				text: '实现一个脚手架',
				link: '/cli/index',
				activeMatch: '/cli/',
			},
		],

		sidebar: {
			'/modules/': { base: '/modules/', items: ModulesSidebar() },
			'/cli/': { base: '/cli/', items: CliSidebar() },
		},

		socialLinks: [
			{ icon: 'github', link: 'https://github.com/raopan2021/RAOPANCLI' },
		],
	},
});

function ModulesSidebar() {
	return [
		{
			text: '模块',
			link: 'index',
			base: '/modules/',
			items: [
				{ text: '介绍', link: 'index' },
				{ text: 'chalk', link: 'chalk' },
				{ text: 'ora', link: 'ora' },
				{ text: 'figlet', link: 'figlet' },
				{ text: 'fs-extra', link: 'fs-extra' },
				{ text: 'commander', link: 'commander' },
				{ text: 'inquirer', link: 'inquirer' },
				{ text: 'download-git-repo', link: 'download-git-repo' },
				{ text: '上传到npm', link: 'publish' },
			],
		},
	];
}
function CliSidebar() {
	return [
		{
			text: '实现一个脚手架',
			link: 'index',
			base: '/cli/',
			items: [{ text: '开始', link: 'index' }],
		},
	];
}
