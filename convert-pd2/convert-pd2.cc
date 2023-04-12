#include <deal.II/base/data_out_base.h>

#include <fstream>
#include <iostream>
#include <string>

using namespace dealii;

template <int dim>
void
convert(const std::string filename)
{
  // Reading pd2 file using read_while_parallel_file
  DataOutReader<dim, dim> data_out_reader;
  std::ifstream           input(filename);
  data_out_reader.read_whole_parallel_file(input);

  // Changing the extension of filename to vtu.
  std::string pd2_filename = filename;
  pd2_filename.replace(filename.length() - 3, 3, "vtu");
  std::ofstream output(pd2_filename);
  data_out_reader.write_vtu(output);
}


int
main(int argc, char *argv[])
{
  if (argc == 3)
    {
      std::string pd2_filename = argv[2];
      if (atoi(argv[1]) == 2)
        {
          convert<2>(pd2_filename);
          std::cout << "Successfully converted! \n";
        }
      else if (atoi(argv[1]) == 3)
        {
          convert<3>(pd2_filename);
          std::cout << "Successfully converted! \n";
        }
      else
        {
          std::cout << "Wrong dimension! " << std::endl;
          std::cout << "Usage: \n \t"
                    << "./convert_pd2 <dim> <filename>" << std::endl;
          return 0;
        }
    }
  else
    {
      std::cout << "Wrong number of arguments! \n ";
      std::cout << "Usage: \n \t"
                << "./convert_pd2 <dim> <filename>" << std::endl;
      return 0;
    }



  return 0;
}