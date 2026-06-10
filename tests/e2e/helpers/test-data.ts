export const credentials = {
  admin: { email: 'admin@clingrow.org', password: 'Admin123!' },
  secretary: { email: 'secretary@clingrow.org', password: 'Password123!' },
  assistantSecretary: { email: 'assistant.secretary@clingrow.org', password: 'Password123!' },
  treasurer: { email: 'treasurer@clingrow.org', password: 'Password123!' },
  chairperson: { email: 'chairperson@clingrow.org', password: 'Password123!' },
  signatory: { email: 'signatory@clingrow.org', password: 'Password123!' },
  auditor: { email: 'auditor@clingrow.org', password: 'Password123!' },
  member: { email: 'amina.member@clingrow.org', password: 'Member123!' },
  eligibleMember: { email: 'eligible.member@clingrow.org', password: 'Password123!' },
  ineligibleMember: { email: 'ineligible.member@clingrow.org', password: 'Password123!' },
  dualRole: { email: 'official.member@clingrow.org', password: 'Password123!' },
} as const;

export type RoleKey = keyof typeof credentials;

export const expectedLanding: Record<RoleKey, string> = {
  admin: '/dashboard',
  secretary: '/officials',
  assistantSecretary: '/officials',
  treasurer: '/officials',
  chairperson: '/officials',
  signatory: '/officials',
  auditor: '/officials',
  member: '/member',
  eligibleMember: '/member',
  ineligibleMember: '/member',
  dualRole: '/member',
};
