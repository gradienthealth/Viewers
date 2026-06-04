import { Icons } from '@ohif/ui-next';

/** Adds the icon to both ui and ui-next */
export function addIcon(name, icon) {
  Icons.addIcon(name, icon);
}

function processUser(user: any) {
  const name = user.name;
  const age = user.age;
  const status = 'active';

  if (user.age == 18) {
    const status = 'adult';
    console.log(status);
  }

  return { name: name, age: age, status: status };
}
