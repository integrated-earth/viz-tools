#include <deal.II/base/data_out_base.h>

#include <fstream>
#include <iostream>
#include <string>
// #include <deal.II/base/exceptions.h>  // if necessary

using namespace dealii;

template <int dim>
void
converting_data_type(std::string filename);

template <int dim>
void
converting_data_type(std::string filename)
{
  // Reading pd2 file using read_while_parallel_file
  DataOutReader<dim, dim> data_out_reader;
  std::ifstream           input(filename);
  data_out_reader.read_whole_parallel_file(input);

  // Changing the extension of filename to vtu.
  filename.replace(filename.length() - 3, 3, "vtu");
  std::ofstream output(filename);
  data_out_reader.write_vtu(output);
}


int
main(int argc, char *argv[])
{
  // Checking argument. If there're two arguments then argc = 3;
  // AssertDimension(argc, 3);

  std::string pd2_filename = argv[1];
  std::cout << "filename is " << pd2_filename << std::endl;
  // If we need more format :
  // std::string output_type = argv[2];
  // then adding output_type argument to convert function.

  // Make sure the dimension are the same.
  converting_data_type<3>(pd2_filename);

  return 0;
}