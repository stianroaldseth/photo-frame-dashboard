// Who's who. Kids' names come from env vars so they stay out of the (public) repo.
export function family(env = process.env) {
  return [
    { id: 'stian', name: 'Stian', color: '#2D5BFF', adult: true },
    { id: 'ulrika', name: 'Ulrika', color: '#E4007C', adult: true },
    { id: 'kid1', name: env.KID1_NAME || 'Barn 1', color: '#00A36C', age: 5 },
    { id: 'kid2', name: env.KID2_NAME || 'Barn 2', color: '#FFB000', age: 2 },
  ];
}
