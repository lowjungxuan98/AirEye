enum GrimRole { sender, receiver }

typedef GrimRoleOption = ({GrimRole role, String title, String description});

/// Role select screen: label copy and [GrimRole] mapping.
const grimRoleOptions = <GrimRoleOption>[
  (role: GrimRole.sender, title: 'SENDER', description: 'Capture and transmit photos'),
  (role: GrimRole.receiver, title: 'RECEIVER', description: 'Receive photo intel in grid'),
];
