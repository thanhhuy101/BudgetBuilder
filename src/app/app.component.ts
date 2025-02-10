import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  ViewChildren,
  QueryList,
  AfterViewInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';

interface BudgetItem {
  category: string;
  subCategories: { name: string; values: number[] }[];
}

interface CellPosition {
  categoryIndex: number;
  subCategoryIndex: number;
  valueIndex: number;
  isName: boolean;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements AfterViewInit {
  title = 'BudgetBuilder';
  @ViewChildren('budgetInput') budgetInputs!: QueryList<ElementRef>;

  months$ = new BehaviorSubject<string[]>([
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]);
  budgetItems = signal<BudgetItem[]>([]);

  // Track current active cell
  currentCell: CellPosition = {
    categoryIndex: 0,
    subCategoryIndex: 0,
    valueIndex: 0,
    isName: false,
  };

  constructor() {
    // Add initial category when component loads
    if (this.budgetItems().length === 0) {
      this.addCategory();
    }
  }

  ngAfterViewInit() {
    // Focus first input on load
    setTimeout(() => {
      const firstInput = this.budgetInputs.first;
      if (firstInput) {
        firstInput.nativeElement.focus();
      }
    });
  }

  // Handle keyboard navigation
  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (!(event.target as HTMLElement).matches('input[type="number"]')) {
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)
      ) {
        event.preventDefault();
        this.handleNavigation(event.key);
      }
    }
  }

  @HostListener('keydown.tab', ['$event'])
  onTab(event: KeyboardEvent) {
    if ((event.target as HTMLElement).matches('input[type="number"]')) {
      const currentInput = event.target as HTMLInputElement;
      const currentRow = currentInput.closest('tr');
      const monthInputs = Array.from(
        currentRow?.querySelectorAll('input[type="number"]') || []
      );
      const currentIndex = monthInputs.indexOf(currentInput);

      // Nếu đang ở ô cuối cùng và nhấn Tab
      if (currentIndex === monthInputs.length - 1 && !event.shiftKey) {
        // Để mặc định behavior của Tab
        return;
      }

      // Nếu đang ở ô đầu tiên và nhấn Shift+Tab
      if (currentIndex === 0 && event.shiftKey) {
        // Để mặc định behavior của Shift+Tab
        return;
      }

      event.preventDefault();
      const nextIndex = event.shiftKey ? currentIndex - 1 : currentIndex + 1;
      if (nextIndex >= 0 && nextIndex < monthInputs.length) {
        const nextInput = monthInputs[nextIndex] as HTMLInputElement;
        nextInput.focus();
        nextInput.select();
      }
    }
  }

  private handleNavigation(key: string) {
    const items = this.budgetItems();
    const currentCategory = items[this.currentCell.categoryIndex];
    const monthsCount = this.months$.value.length;

    switch (key) {
      case 'ArrowUp':
        if (this.currentCell.subCategoryIndex > 0) {
          this.currentCell.subCategoryIndex--;
        } else if (this.currentCell.categoryIndex > 0) {
          this.currentCell.categoryIndex--;
          this.currentCell.subCategoryIndex =
            items[this.currentCell.categoryIndex].subCategories.length - 1;
        }
        break;

      case 'ArrowDown':
      case 'Enter':
        const currentSubCategories = currentCategory.subCategories;
        if (
          this.currentCell.subCategoryIndex <
          currentSubCategories.length - 1
        ) {
          this.currentCell.subCategoryIndex++;
        } else if (this.currentCell.categoryIndex < items.length - 1) {
          this.currentCell.categoryIndex++;
          this.currentCell.subCategoryIndex = 0;
        } else if (key === 'Enter') {
          // Add new subcategory when pressing Enter on last cell
          this.addSubCategory(currentCategory);
          this.currentCell.subCategoryIndex =
            currentCategory.subCategories.length - 1;
          this.currentCell.valueIndex = 0;
        }
        break;

      case 'ArrowLeft':
        if (this.currentCell.isName) {
          this.currentCell.isName = false;
        } else if (this.currentCell.valueIndex > 0) {
          this.currentCell.valueIndex--;
        } else {
          this.currentCell.isName = true;
        }
        break;

      case 'ArrowRight':
      case 'Tab':
        if (this.currentCell.isName) {
          this.currentCell.isName = false;
          this.currentCell.valueIndex = 0;
        } else if (this.currentCell.valueIndex < monthsCount - 1) {
          // Thay đổi logic ở đây
          this.currentCell.valueIndex++;
        } else {
          // Chỉ xuống hàng khi đã ở tháng cuối cùng (tháng 12)
          if (this.currentCell.valueIndex === monthsCount - 1) {
            // Move to next row
            if (
              this.currentCell.subCategoryIndex <
              currentCategory.subCategories.length - 1
            ) {
              this.currentCell.subCategoryIndex++;
              this.currentCell.valueIndex = 0;
              this.currentCell.isName = true;
            } else if (this.currentCell.categoryIndex < items.length - 1) {
              this.currentCell.categoryIndex++;
              this.currentCell.subCategoryIndex = 0;
              this.currentCell.valueIndex = 0;
              this.currentCell.isName = true;
            }
          }
        }
        break;
    }

    // Focus the new cell
    this.focusCell();
  }

  private focusCell() {
    setTimeout(() => {
      const inputs = this.budgetInputs.toArray();
      const currentCategory =
        this.budgetItems()[this.currentCell.categoryIndex];
      if (!currentCategory) return;

      let inputIndex = 0;
      // Calculate input index based on current position
      for (let i = 0; i < this.currentCell.categoryIndex; i++) {
        inputIndex += 1; // Category name
        inputIndex +=
          this.budgetItems()[i].subCategories.length *
          (this.months$.value.length + 1); // Subcategories (name + values)
      }
      inputIndex +=
        this.currentCell.subCategoryIndex * (this.months$.value.length + 1); // Current subcategory offset
      if (this.currentCell.isName) {
        inputIndex += this.currentCell.subCategoryIndex;
      } else {
        inputIndex += this.currentCell.valueIndex + 1;
      }

      const targetInput = inputs[inputIndex];
      if (targetInput) {
        targetInput.nativeElement.focus();
        targetInput.nativeElement.select();
      }
    });
  }

  // Your existing methods stay the same
  addCategory() {
    this.budgetItems.update((items) => [
      ...items,
      { category: '', subCategories: [] },
    ]);
  }

  addSubCategory(category: BudgetItem) {
    category.subCategories.push({ name: '', values: new Array(12).fill(0) });
    this.budgetItems.update((items) => [...items]);
  }

  confirmDeleteCategory(category: BudgetItem) {
    const confirmDelete = confirm('Bạn có chắc muốn xóa danh mục này không?');
    if (confirmDelete) {
      this.deleteCategory(category);
    }
  }

  deleteCategory(category: BudgetItem) {
    this.budgetItems.update((items) =>
      items.filter((item) => item !== category)
    );
  }

  confirmDeleteSubCategory(
    category: BudgetItem,
    subCategory: { name: string; values: number[] }
  ) {
    const confirmDelete = confirm('Bạn có chắc muốn xóa hàng này không?');
    if (confirmDelete) {
      this.deleteSubCategory(category, subCategory);
    }
  }

  deleteSubCategory(
    category: BudgetItem,
    subCategory: { name: string; values: number[] }
  ) {
    this.budgetItems.update((items) => {
      const updatedItems = items.map((item) => {
        if (item === category) {
          return {
            ...item,
            subCategories: item.subCategories.filter(
              (sub) => sub !== subCategory
            ),
          };
        }
        return item;
      });
      return updatedItems;
    });
  }

  applyToAll(
    subCategory: { name: string; values: number[] },
    index: number,
    event: Event
  ) {
    event.preventDefault();
    const valueToApply = subCategory.values[index];
    this.budgetItems.update((items) => {
      return items.map((category) => {
        return {
          ...category,
          subCategories: category.subCategories.map((sub) => {
            if (sub.name === subCategory.name) {
              return { ...sub, values: sub.values.map(() => valueToApply) };
            }
            return sub;
          }),
        };
      });
    });
  }

  calculateSubTotal(category: BudgetItem): number[] {
    return (
      category.subCategories[0]?.values.map((_, i) =>
        category.subCategories.reduce((sum, sub) => sum + sub.values[i], 0)
      ) || new Array(12).fill(0)
    );
  }

  calculateTotal(): number[] {
    return this.budgetItems().reduce((totals, category) => {
      return totals.map((sum, i) => sum + this.calculateSubTotal(category)[i]);
    }, new Array(12).fill(0));
  }

  onInputKeyDown(event: KeyboardEvent) {
    // Chỉ xử lý navigation khi nhấn các phím điều hướng
    if (
      [
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Tab',
        'Enter',
      ].includes(event.key)
    ) {
      this.handleNavigation(event.key);
      event.preventDefault();
    }
  }
}
