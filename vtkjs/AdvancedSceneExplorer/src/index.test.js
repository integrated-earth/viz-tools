import { emptyContainer } from './index';

describe('DOM Utilities', () => {
  it('emptyContainer should remove all child elements from a given element', () => {
    // Set up a dummy element with children
    document.body.innerHTML = '<div id="container"><p>child1</p><span>child2</span></div>';
    const container = document.getElementById('container');

    // Verify it has children before the test
    expect(container.children.length).toBe(2);

    // Run the function
    emptyContainer(container);

    // Assert that it has no children after
    expect(container.children.length).toBe(0);
  });
});
