import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';

import DatabaseList from '../components/DatabaseList.vue';
import AddDatabaseModal from '../components/AddDatabaseModal.vue';
import HamburgerMenu from '../components/HamburgerMenu.vue';

describe('DatabaseList', () => {
  it('renders databases', () => {
    const wrapper = mount(DatabaseList, {
      props: { databases: [{ name: 'db1' }, { name: 'db2' }] }
    });
    expect(wrapper.findAll('li').length).toBe(2);
  });
});

describe('AddDatabaseModal', () => {
  it('emits save with selected files', () => {
    global.alert = vi.fn();
    const wrapper = mount(AddDatabaseModal);
    wrapper.vm.scbFile = { path: '/tmp/a.zip' };
    wrapper.vm.credsFile = { path: '/tmp/b.json' };
    wrapper.vm.onSave();
    expect(wrapper.emitted().save[0][0]).toEqual({
      scbFile: { path: '/tmp/a.zip' },
      credsFile: { path: '/tmp/b.json' }
    });
  });

  it('emits test with selected files', () => {
    global.alert = vi.fn();
    const wrapper = mount(AddDatabaseModal);
    wrapper.vm.scbFile = { path: '/tmp/a.zip' };
    wrapper.vm.credsFile = { path: '/tmp/b.json' };
    wrapper.vm.onTest();
    expect(wrapper.emitted().test[0][0]).toEqual({
      scbFile: { path: '/tmp/a.zip' },
      credsFile: { path: '/tmp/b.json' }
    });
  });
});

describe('HamburgerMenu', () => {
  it('toggles menu and emits toggle-dark', async () => {
    const wrapper = mount(HamburgerMenu);
    expect(wrapper.vm.menuOpen).toBe(false);
    await wrapper.find('button.hamburger').trigger('click');
    expect(wrapper.vm.menuOpen).toBe(true);
    await wrapper.find('.menu button').trigger('click');
    expect(wrapper.emitted()['toggle-dark']).toBeTruthy();
    expect(wrapper.vm.menuOpen).toBe(false);
  });
});
