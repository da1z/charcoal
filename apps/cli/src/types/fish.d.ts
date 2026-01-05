// Type declaration for .fish file imports
export type __placeholder = never;

declare module "*.fish" {
	const content: string;
	// eslint-disable-next-line import/no-default-export
	export default content;
}
