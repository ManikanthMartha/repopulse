export interface LabelFilter {
  include?: string[];
  exclude?: string[];
}

export interface RepoDescriptor {
  fullName: string;
  webhookId?: string | null;
}

export interface SimplifiedIssueEvent {
  action: string;
  title: string;
  url: string;
  author: string;
  labels: string[];
  repoFullName: string;
  number: number;
}

export interface SimplifiedPullRequestEvent extends SimplifiedIssueEvent {}
