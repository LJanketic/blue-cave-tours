import type { AstroIntegration } from 'astro';

/**
 * The component kit page (spec §14.3) exists in `astro dev` and in Netlify
 * deploy previews only. Production builds never contain it.
 */
export function includesDevKit(command: string, context: string | undefined): boolean {
	return command === 'dev' || context === 'deploy-preview';
}

export const devKitIntegration: AstroIntegration = {
	name: 'dev-kit',
	hooks: {
		'astro:config:setup': ({ command, injectRoute }) => {
			if (!includesDevKit(command, process.env.CONTEXT)) return;
			injectRoute({ pattern: '/dev/kit', entrypoint: './src/dev/kit.astro', prerender: true });
		},
	},
};
