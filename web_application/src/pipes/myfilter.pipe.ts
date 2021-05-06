import {Pipe, PipeTransform} from '@angular/core';
import {Post} from '../models/wall';
import {Category} from '../models/category';

@Pipe({
  name: 'categoryFilter',
  pure: false
})
export class CategoryFilterPipe implements PipeTransform {
  transform(items: Post[], filter: Category): Post[] {
    if (!items || !filter) {
      return items;
    }

    if (filter.id === 0) {
      return items;
    }

    return items.filter(item => item.category_id === filter.id);
  }
}

@Pipe({
  name: 'queryFilter',
  pure: false
})
export class QueryFilterPipe implements PipeTransform {
  transform(items: Post[], filter: string): Post[] {
    if (!items || !filter) {
      return items;
    }

    if (filter === '') {
      return items;
    }

    return items.filter(item => item.title.toLowerCase().includes(filter.toLowerCase()));
  }
}
