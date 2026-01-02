import { simpleGit, SimpleGit } from 'simple-git';

export interface GitOptions {
  operation: 'status' | 'diff' | 'log' | 'blame' | 'add' | 'commit' | 'branch' | 'stash';
  repoPath: string;
  files?: string[];
  message?: string;
  branch?: string;
  count?: number;
  args?: string[];
}

export async function executeGitOperation(options: GitOptions): Promise<string> {
  const { operation, repoPath, files, message, branch, count = 10, args = [] } = options;

  const git: SimpleGit = simpleGit(repoPath);

  switch (operation) {
    case 'status': {
      const status = await git.status();
      const output: string[] = [];
      output.push(`Repository: ${repoPath}`);
      output.push(`Branch: ${status.current}`);
      output.push(`\nChanges:`);
      
      if (status.modified.length > 0) {
        output.push(`\nModified (${status.modified.length}):`);
        status.modified.forEach(f => output.push(`  M ${f}`));
      }
      
      if (status.created.length > 0) {
        output.push(`\nAdded (${status.created.length}):`);
        status.created.forEach(f => output.push(`  A ${f}`));
      }
      
      if (status.deleted.length > 0) {
        output.push(`\nDeleted (${status.deleted.length}):`);
        status.deleted.forEach(f => output.push(`  D ${f}`));
      }
      
      if (status.not_added.length > 0) {
        output.push(`\nUntracked (${status.not_added.length}):`);
        status.not_added.forEach(f => output.push(`  ? ${f}`));
      }
      
      if (status.isClean()) {
        output.push('\n✅ Working tree clean');
      }
      
      return output.join('\n');
    }

    case 'diff': {
      const diff = files && files.length > 0
        ? await git.diff(files)
        : await git.diff();
      return diff || 'No differences';
    }

    case 'log': {
      const log = await git.log({ maxCount: count, ...args });
      const output: string[] = [];
      output.push(`Commits (${log.total}):\n`);
      
      log.all.forEach(commit => {
        output.push(`commit ${commit.hash}`);
        output.push(`Author: ${commit.author_name} <${commit.author_email}>`);
        output.push(`Date:   ${commit.date}`);
        output.push(`\n    ${commit.message}\n`);
      });
      
      return output.join('\n');
    }

    case 'blame': {
      if (!files || files.length === 0) {
        throw new Error('Blame requires at least one file');
      }
      
      const blame = await git.raw(['blame', ...files]);
      return blame;
    }

    case 'add': {
      if (!files || files.length === 0) {
        throw new Error('Add requires at least one file');
      }
      
      await git.add(files);
      return `✅ Staged ${files.length} file(s): ${files.join(', ')}`;
    }

    case 'commit': {
      if (!message) {
        throw new Error('Commit requires a message');
      }
      
      const result = await git.commit(message);
      return `✅ Committed: ${result.commit}\n${message}`;
    }

    case 'branch': {
      if (branch) {
        // Create or switch to branch
        const branches = await git.branchLocal();
        if (branches.all.includes(branch)) {
          await git.checkout(branch);
          return `✅ Switched to branch: ${branch}`;
        } else {
          await git.checkoutLocalBranch(branch);
          return `✅ Created and switched to branch: ${branch}`;
        }
      } else {
        // List branches
        const branches = await git.branchLocal();
        const output: string[] = [];
        output.push('Branches:');
        branches.all.forEach(b => {
          const marker = b === branches.current ? '* ' : '  ';
          output.push(`${marker}${b}`);
        });
        return output.join('\n');
      }
    }

    case 'stash': {
      if (args.includes('list')) {
        const stashList = await git.stashList();
        if (stashList.total === 0) {
          return 'No stashes';
        }
        const output: string[] = [];
        output.push(`Stashes (${stashList.total}):\n`);
        stashList.all.forEach(stash => {
          output.push(`${stash.hash}: ${stash.message}`);
        });
        return output.join('\n');
      } else if (args.includes('pop')) {
        await git.stash(['pop']);
        return '✅ Popped stash';
      } else {
        await git.stash();
        return '✅ Created stash';
      }
    }

    default:
      throw new Error(`Unknown git operation: ${operation}`);
  }
}
