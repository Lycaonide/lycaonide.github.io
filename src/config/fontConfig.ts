/**
 * 字体配置（统一入口）
 *
 * 所有字体相关配置都在此文件中定义：
 * - fonts：Astro Font API 字体定义（本方案全部使用本地字体文件，零外网下载）
 * - fontConfig：字体选择与区域覆盖
 *
 * 本地字体方案说明（国内网络 jsdelivr 被墙，不依赖任何 CDN）：
 * 1. woff2 字体文件位于 public/assets/fonts/（从 @fontsource npm 包复制）
 * 2. fonts 数组使用 provider: "local" 引用本地文件
 * 3. 构建时 scripts/subset-fonts.ts 扫描页面实际字符，生成轻量 woff2 子集
 */
import type { FontDefinition, FontSelectionConfig } from "@/types/fontConfig";

// ─── Astro Font API 字体定义（全部本地字体）────────────────
export const fontsList: FontDefinition[] = [
	{
		name: "Noto Sans SC",
		cssVariable: "--font-noto-sans-sc",
		provider: "local",
		options: {
			variants: [
				{
					src: ["./public/assets/fonts/noto-sans-sc-500.woff2"],
					weight: "500",
				},
			],
		},
		fallbacks: ["sans-serif"],
	},
	{
		name: "Space Grotesk",
		cssVariable: "--font-space-grotesk",
		provider: "local",
		options: {
			variants: [
				{
					src: ["./public/assets/fonts/space-grotesk-500.woff2"],
					weight: "500",
				},
			],
		},
		fallbacks: ["sans-serif"],
	},
	{
		name: "JetBrains Mono",
		cssVariable: "--font-jetbrains-mono",
		provider: "local",
		options: {
			variants: [
				{
					src: ["./public/assets/fonts/jetbrains-mono-400.woff2"],
					weight: "400",
				},
				{
					src: ["./public/assets/fonts/jetbrains-mono-700.woff2"],
					weight: "700",
				},
			],
		},
		fallbacks: [
			"ui-monospace",
			"SFMono-Regular",
			"Menlo",
			"Monaco",
			"Consolas",
			"Liberation Mono",
			"Courier New",
			"monospace",
		],
	},
];

// ─── 字体选择与区域覆盖 ─────────────────────────────────────
export const fontConfig: FontSelectionConfig = {
	// 启用自定义字体（全部为本地字体，无外网依赖）
	enable: true,
	// 全局正文保持系统字体（中文正文加载 web 字体性价比低）
	selected: ["system"],

	// 各区域独立字体设置（填上方 fonts 的 cssVariable，留空则用全局 selected）
	// 主页横幅主标题字体：思源黑体 Noto Sans SC
	bannerTitleFont: "--font-noto-sans-sc",
	// 主页横幅副标题字体：思源黑体 Noto Sans SC
	bannerSubtitleFont: "--font-noto-sans-sc",
	// 导航栏标题字体：Space Grotesk
	navbarTitleFont: "--font-space-grotesk",
	// 代码块字体：JetBrains Mono
	codeFont: "--font-jetbrains-mono",

	// 本地字体子集化配置（构建时由 scripts/subset-fonts.ts 处理）
	subsetFonts: {
		"--font-noto-sans-sc": {
			extraChars: "",
		},
		"--font-space-grotesk": {
			extraChars: "",
		},
		"--font-jetbrains-mono": {
			extraChars: "",
		},
	},
};
