import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

export default defineConfig({
	site: 'https://apollo.studiocms.xyz',
	experimental: {
		directRenderScript: true,
	},
	image: {
		remotePatterns: [{ protocol: 'https' }],
	},
	integrations: [
		starlight({
			title: 'Apollo',
			description: '',
			lastUpdated: true,
			credits: true,
			tagline: '',
			expressiveCode: true,
			components: {
				SiteTitle: './src/starlightOverrides/SiteTitle.astro',
				PageTitle: './src/starlightOverrides/PageTitle.astro',
				Head: './src/starlightOverrides/Head.astro',
			},
			social: {
				github: 'https://github.com/withstudiocms/studiocms',
				discord: 'https://chat.studiocms.xyz',
				youtube: 'https://www.youtube.com/@StudioCMS',
				'x.com': 'https://x.com/_studiocms',
				blueSky: 'https://bsky.app/profile/studiocms.xyz',
			},
			customCss: [
				'./src/styles/shiki.css',
				'./src/styles/sponsorcolors.css',
				'./src/styles/starlight.css',
				'./src/styles/twoslash.css',
			],
			editLink: {
				baseUrl: 'https://github.com/withstudiocms/apollo', // TODO
			},
			// head: [
			// 	{
			// 		tag: 'script',
			// 		attrs: {
			// 			src: 'https://analytics.studiocms.xyz/script.js',
			// 			'data-website-id': '00717cde-0d92-42be-8f49-8de0b1d810b2',
			// 			defer: true,
			// 		},
			// 	},
			// 	{
			// 		tag: 'meta',
			// 		attrs: {
			// 			property: 'og:image',
			// 			content: `${site}og.jpg?v=1`,
			// 		},
			// 	},
			// 	{
			// 		tag: 'meta',
			// 		attrs: {
			// 			property: 'twitter:image',
			// 			content: `${site}og.jpg?v=1`,
			// 		},
			// 	},
			// ],
			sidebar: [
				{
					label: 'Learn',
					items: [
						{
							label: 'Start Here',
							autogenerate: { directory: 'start-here' },
						},
						{
							label: 'Understanding StudioCMS',
							autogenerate: { directory: 'how-it-works' },
						},
						{
							label: 'Package Catalog',
							items: [
								{
									label: 'Package List',
									link: '/package-catalog',
									badge: { text: 'New', variant: 'success' },
								},
								{
									label: 'StudioCMS Integrations',
									autogenerate: { directory: 'package-catalog/studiocms-integrations' },
									collapsed: true,
								},
								{
									label: 'Community Integrations',
									autogenerate: { directory: 'package-catalog/community-integrations' },
									collapsed: true,
								},
							],
						},
						{
							label: 'Customizing StudioCMS',
							items: [
								{
									label: '@studiocms/renderers',
									autogenerate: { directory: 'customizing/studiocms-renderers' },
									collapsed: true,
								},
								{
									label: '@studiocms/ui',
									badge: { text: 'New', variant: 'success' },
									items: [
										{ label: 'Getting Started', link: 'customizing/studiocms-ui/' },
										{
											label: 'Components',
											autogenerate: {
												directory: 'customizing/studiocms-ui/components',
												collapsed: true,
											},
										},
									],
									collapsed: true,
								},
							],
						},
					],
				},
				{
					label: 'References',
					items: [
						{
							label: 'Configuration Reference',
							autogenerate: { directory: 'config-reference' },
							collapsed: false,
						},
					],
				},
			],
		}),
	],
});
