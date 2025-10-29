// Define types for local file operations
export interface LocalFileItem {
  contentType?: string;
  createdTime: Date;
  isDirectory: boolean;
  lastAccessTime: Date;
  // Spotlight specific metadata
  metadata?: {
    [key: string]: any;
  };
  modifiedTime: Date;
  name: string;
  path: string;
  size: number;
  type: string;
}

export interface ListLocalFileParams {
  path: string;
}

export interface MoveLocalFileParams {
  newPath: string;
  oldPath: string;
}

export interface MoveLocalFilesParams {
  items: MoveLocalFileParams[];
}

export interface LocalMoveFilesResultItem {
  error?: string; // Error message if this specific item failed
  newPath?: string; // The final path after moving/renaming, if successful
  sourcePath: string; // The original path of the item being moved/renamed
  success: boolean; // Whether the operation for this specific item was successful
}

export interface RenameLocalFileParams {
  newName: string;
  path: string;
}

export interface RenameLocalFileResult {
  error?: any;
  newPath: string;
  success: boolean;
}

export interface LocalReadFileParams {
  loc?: [number, number];
  path: string;
}

export interface LocalReadFilesParams {
  paths: string[];
}

export interface WriteLocalFileParams {
  /**
   * 要写入的内容
   */
  content: string;

  /**
   * 要写入的文件路径
   */
  path: string;
}

export interface LocalReadFileResult {
  /**
   * Character count of the content within the specified `loc` range.
   */
  charCount: number;
  /**
   * Content of the file within the specified `loc` range.
   */
  content: string;
  createdTime: Date;
  fileType: string;
  filename: string;
  /**
   * Line count of the content within the specified `loc` range.
   */
  lineCount: number;
  loc: [number, number];
  modifiedTime: Date;
  /**
   * Total character count of the entire file.
   */
  totalCharCount: number;
  /**
   * Total line count of the entire file.
   */
  totalLineCount: number;
}

export interface LocalSearchFilesParams {
  directory?: string;
  keywords: string; // Optional directory to limit search
}

export interface OpenLocalFileParams {
  path: string;
}

export interface OpenLocalFolderParams {
  isDirectory?: boolean;
  path: string;
}

// Shell command types
export interface RunCommandParams {
  command: string;
  description?: string;
  run_in_background?: boolean;
  timeout?: number;
}

export interface RunCommandResult {
  error?: string;
  exit_code?: number;
  output?: string;
  shell_id?: string;
  stderr?: string;
  stdout?: string;
  success: boolean;
}

export interface GetCommandOutputParams {
  filter?: string;
  shell_id: string;
}

export interface GetCommandOutputResult {
  error?: string;
  output: string;
  running: boolean;
  stderr: string;
  stdout: string;
  success: boolean;
}

export interface KillCommandParams {
  shell_id: string;
}

export interface KillCommandResult {
  error?: string;
  success: boolean;
}

// Grep types
export interface GrepContentParams {
  '-A'?: number;
  '-B'?: number;
  '-C'?: number;
  '-i'?: boolean;
  '-n'?: boolean;
  'glob'?: string;
  'head_limit'?: number;
  'multiline'?: boolean;
  'output_mode'?: 'content' | 'files_with_matches' | 'count';
  'path'?: string;
  'pattern': string;
  'type'?: string;
}

export interface GrepContentResult {
  matches: string[];
  success: boolean;
  total_matches: number;
}

// Glob types
export interface GlobFilesParams {
  path?: string;
  pattern: string;
}

export interface GlobFilesResult {
  files: string[];
  success: boolean;
  total_files: number;
}

// Edit types
export interface EditLocalFileParams {
  file_path: string;
  new_string: string;
  old_string: string;
  replace_all?: boolean;
}

export interface EditLocalFileResult {
  error?: string;
  replacements: number;
  success: boolean;
}
