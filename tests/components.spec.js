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
  it('emits save with selected files and name', () => {
    global.alert = vi.fn();
    const wrapper = mount(AddDatabaseModal);
    wrapper.vm.scbFile = { path: '/tmp/a.zip' };
    wrapper.vm.credsFile = { path: '/tmp/b.json' };
    wrapper.vm.dbName = 'My DB';
    wrapper.vm.onSave();
    const ev = wrapper.emitted().save?.[0] || [];
    expect(ev[0]).toEqual({
      scbFile: { path: '/tmp/a.zip' },
      credsFile: { path: '/tmp/b.json' }
    });
    expect(ev[1]).toBe('My DB');
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
    const wrapper = mount(HamburgerMenu, { props: { dark: true } });
    expect(wrapper.vm.menuOpen).toBe(false);
    await wrapper.find('button.hamburger').trigger('click');
    expect(wrapper.vm.menuOpen).toBe(true);
    await wrapper.find('.menu .icon-btn').trigger('click');
    expect(wrapper.emitted()['toggle-dark']).toBeTruthy();
    // menu stays open after toggling dark
    expect(wrapper.vm.menuOpen).toBe(true);
  });
});

describe('DbExplorer filters', () => {
  it('filters tables and types by query', async () => {
    // Minimal stub to avoid IPC calls in mounted
    const tables = ['users', 'orders', 'events'];
    const types = ['address', 'profile'];
    global.window = global.window || {};
    window.electronAPI = {
      dbSchema: () => Promise.resolve({ success: true, tables, types }),
      describeTable: () => Promise.resolve({ success: true, createCql: '' }),
      describeType: () => Promise.resolve({ success: true, createCql: '' })
    };
    vi.mock('../components/CqlConsole.vue', () => ({ default: { template: '<div />' } }));
    const DbExplorer = (await import('../components/DbExplorer.vue')).default;
    const wrapper = mount(DbExplorer, { props: { db: { slug: 's', name: 'N' } } });
    await wrapper.vm.$nextTick();
    wrapper.vm.tableQuery = 'us';
    wrapper.vm.typeQuery = 'pro';
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.filteredTables).toEqual(['users']);
    expect(wrapper.vm.filteredTypes).toEqual(['profile']);
  });
});
